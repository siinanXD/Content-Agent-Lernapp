/**
 * SIN-437 — Goldset-Vergleich aller Kandidaten (Claude und OpenAI) auf denselben 20 LF3-Einheiten.
 *
 * Normale Aufrufe (kein Batch), gleicher Prompt, gleiche Didaktik-Vorgaben, ein Reparatur-Durchgang.
 * Zwei Richter je Kandidat (gpt-5.4-mini und Claude Haiku 5.5); eine Frage besteht nur mit beiden.
 * Deckel 6 €: bei Überschreitung Abbruch, der Teilbericht wird geschrieben. Veröffentlicht nichts.
 *
 * Usage:
 *   npm run ap22:alle
 *   npm run ap22:alle:dry     (kostet nichts: Kandidaten und Kostenschätzung)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { anthropicFetch } from "../src/lib/anthropic/client";
import { compactApiError } from "../src/lib/api-error";
import { flushLangfuseOtel } from "../src/lib/quality/langfuse-otel";
import { traceVergleich } from "../src/lib/quality/vergleich-traces";
import { loadMafCurriculum } from "../src/lib/content/curriculum";
import {
  annotateUnit,
  chunkPrompt,
  MAX_OUTPUT_TOKENS,
  parseLernfeldJson,
  UNITS_PER_CHUNK,
  type BatchChunkTarget,
} from "../src/lib/generate/batch-generate";
import { generatorSystemText } from "../src/lib/generate/didaktik-prompts";
import type { GeneratedUnit } from "../src/lib/generate/maf-lernfeld-seed";
import {
  MIN_PASSED_QUESTIONS,
  annotateRepairQuestions,
  applyRepair,
  buildRepairPrompt,
  parseRepairQuestions,
  planFromEvals,
} from "../src/lib/generate/repair-questions";
import { OPENAI_CANDIDATES, openaiGenerate, openaiUsd, QUESTIONS_JSON_SCHEMA, UNITS_JSON_SCHEMA } from "../src/lib/openai/candidates";
import {
  ALLE_BUDGET_EUR,
  ALLE_BUDGET_USD,
  allCandidates,
  estimateCandidate,
  renderAlleMarkdown,
  USD_PER_EUR,
  type AlleReport,
  type Candidate,
  type FailedCandidate,
  type ModelReport,
} from "../src/lib/quality/ab-alle";
import { claudeJudge, CLAUDE_JUDGE_MODEL } from "../src/lib/quality/claude-judge";
import { addOpenAIUsage, claudeStandardUsd, emptyLedger } from "../src/lib/quality/cost-guard";
import { JUDGE_MODEL, liveJudgeWithUsage, type EvalItem } from "../src/lib/quality/evaluate-agent";
import { combineJudges, judgeMeans, meanOfJudges } from "../src/lib/quality/two-judges";
import type { QuestionEval } from "../src/lib/quality/schemas";

const OUT_DIR = join(process.cwd(), "docs", "ops", "ap22-runs");
const REPORT_DIR = join(process.cwd(), "docs", "quality", "runs");
const KEYWORD = "Maschinen- und Anlagenführer";
const MODULE_ID = "LF3";
const UNIT_TARGET = 20;
const CONCURRENCY = 4;
/** Normale Aufrufe: 2 Einheiten je Aufruf passen in 16k Ausgabe-Token. */
const CLAUDE_MAX_TOKENS = 16000;

const hasFlag = (n: string) => process.argv.includes(`--${n}`);

class BudgetExceeded extends Error {}

function lf3Targets(): BatchChunkTarget[] {
  const mod = loadMafCurriculum().modules.find((m) => m.id === MODULE_ID);
  if (!mod) throw new Error(`Modul ${MODULE_ID} fehlt`);
  const targets: BatchChunkTarget[] = [];
  let left = UNIT_TARGET;
  for (const block of mod.blocks) {
    for (let offset = 0; offset < block.units && left > 0; offset += UNITS_PER_CHUNK) {
      const unitCount = Math.min(UNITS_PER_CHUNK, block.units - offset, left);
      targets.push({ customId: `alle-${block.id}-u${offset}-${offset + unitCount - 1}`, module: mod, block, unitOffset: offset, unitCount });
      left -= unitCount;
    }
    if (left <= 0) break;
  }
  return targets;
}

function flatten(units: GeneratedUnit[]): EvalItem[] {
  const c = loadMafCurriculum();
  return units.flatMap((u) => {
    const mod = c.modules.find((m) => m.id === u.moduleId);
    return u.questions.map((q) => ({
      id: `${u.id}-${q.id}`,
      unitId: u.id,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
      moduleId: u.moduleId,
      blockId: u.blockId,
      year: mod?.year,
      niveauHint: u.niveau ?? mod?.niveau,
      safety: u.safetyFlag ?? mod?.safety,
    }));
  });
}

async function pool<T, R>(items: T[], fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

/** Bis zu 2 Wiederholungen bei Überlast (429/5xx); andere Fehler sofort. */
async function retry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt >= 2 || !/\b(429|5\d\d)\b/.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
}

async function claudeGenerate(model: string, system: string, user: string) {
  const res = await anthropicFetch("/v1/messages", {
    method: "POST",
    body: JSON.stringify({ model, max_tokens: Math.min(CLAUDE_MAX_TOKENS, MAX_OUTPUT_TOKENS), system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status} (${model}): ${compactApiError(await res.text().catch(() => ""))}`);
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  return {
    text: (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n"),
    usage: { prompt_tokens: data.usage?.input_tokens ?? 0, completion_tokens: data.usage?.output_tokens ?? 0 },
  };
}

function dryRun(runId: string) {
  const estimates = allCandidates().map((c) => estimateCandidate(c, UNIT_TARGET));
  const totalUsd = Math.round(estimates.reduce((s, e) => s + e.totalUsd, 0) * 100) / 100;
  const totalEur = Math.round((totalUsd / USD_PER_EUR) * 100) / 100;
  console.log(`Kandidaten (${estimates.length}), ${UNIT_TARGET} Einheiten ${MODULE_ID}; Richter ${JUDGE_MODEL} + ${CLAUDE_JUDGE_MODEL}`);
  for (const e of estimates)
    console.log(`  ${e.id}: ~$${e.totalUsd} (Erzeugen ${e.generationUsd}, Reparatur ${e.repairUsd}, Richter ${e.judgeUsd})${e.priceVerified ? "" : " [Preis angenommen]"}`);
  console.log(`Schätzung gesamt ~$${totalUsd} (~${totalEur} €), Deckel ${ALLE_BUDGET_EUR} € ($${ALLE_BUDGET_USD.toFixed(2)})`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${runId}-alle-dry-run.json`), JSON.stringify({ candidates: estimates, totalUsd, totalEur, budgetEur: ALLE_BUDGET_EUR }, null, 2));
  if (totalUsd > ALLE_BUDGET_USD) throw new Error(`Schätzung ${totalEur} € über dem Deckel ${ALLE_BUDGET_EUR} €`);
  console.log("dry-run ok");
}

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  if (hasFlag("dry-run")) return dryRun(runId);

  const missing = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"].filter((n) => !process.env[n]?.trim());
  if (missing.length) {
    console.error(`STOP: Secrets fehlen (${missing.join(", ")}; nur Namen gemeldet)`);
    process.exit(2);
  }
  const key = process.env.OPENAI_API_KEY!.trim();
  const c = loadMafCurriculum();
  const targets = lf3Targets();
  const system = generatorSystemText();
  let totalUsd = 0;
  const guard = () => {
    if (totalUsd >= ALLE_BUDGET_USD) throw new BudgetExceeded(`Deckel ${ALLE_BUDGET_EUR} € erreicht ($${totalUsd.toFixed(2)})`);
  };
  const models: ModelReport[] = [];
  const failed: FailedCandidate[] = [];
  let aborted: string | undefined;

  const generate = async (cand: Candidate, user: string, schema: "units" | "questions") => {
    guard();
    const r =
      cand.provider === "anthropic"
        ? await retry(() => claudeGenerate(cand.id, system, user))
        : await retry(() =>
            openaiGenerate(key, {
              model: cand.id,
              system,
              user,
              schema: { name: schema, schema: schema === "units" ? UNITS_JSON_SCHEMA : QUESTIONS_JSON_SCHEMA },
            }),
          );
    const usd = cand.provider === "anthropic" ? claudeStandardUsd(cand.id, r.usage) : openaiUsd(cand.id, r.usage);
    totalUsd += usd;
    return { text: r.text, usd, usage: r.usage };
  };

  const bothJudges = async (units: GeneratedUnit[]) => {
    guard();
    const items = flatten(units);
    const [o, cl] = await Promise.all([retry(() => liveJudgeWithUsage(key, items)), retry(() => claudeJudge(items))]);
    const openaiUsd_ = addOpenAIUsage(emptyLedger(), o.usage.prompt_tokens, o.usage.completion_tokens).usdEstimate;
    const claudeUsd = claudeStandardUsd(CLAUDE_JUDGE_MODEL, cl.usage);
    totalUsd += openaiUsd_ + claudeUsd;
    return { o: o.questions, cl: cl.questions, openaiUsd: openaiUsd_, claudeUsd };
  };

  for (const cand of allCandidates()) {
    try {
      console.log("Kandidat", cand.id);
      const cost = { generation: 0, repair: 0, judgeOpenai: 0, judgeClaude: 0 };
      const failedChunks: string[] = [];
      const units: GeneratedUnit[] = [];
      const gens = await pool(targets, async (t) => {
        const r = await generate(cand, chunkPrompt(c, t.module, t.block, t.unitOffset, t.unitCount, KEYWORD), "units");
        return { t, ...r };
      });
      const genUsage = { input: 0, output: 0 };
      for (const g of gens) {
        cost.generation += g.usd;
        genUsage.input += g.usage.prompt_tokens;
        genUsage.output += g.usage.completion_tokens;
        const parsed = parseLernfeldJson(g.text);
        if (!parsed?.units?.length) failedChunks.push(g.t.customId);
        else units.push(...parsed.units.map((u) => annotateUnit(u, { module: g.t.module, block: g.t.block }, c)));
      }

      const j = await bothJudges(units);
      cost.judgeOpenai += j.openaiUsd;
      cost.judgeClaude += j.claudeUsd;
      const { combined, disagreement } = combineJudges(j.o, j.cl);
      // SIN-448: je Einheit ein Langfuse-Trace (Bewertung vor der Reparatur, beide Richter kombiniert).
      const traces = await traceVergleich({
        runId,
        modell: cand.id,
        modul: MODULE_ID,
        units,
        evals: combined,
        usage: { inputTokens: genUsage.input, outputTokens: genUsage.output, costEur: cost.generation / USD_PER_EUR },
        richterModell: `${JUDGE_MODEL} + ${CLAUDE_JUDGE_MODEL}`,
        minBestanden: MIN_PASSED_QUESTIONS,
      });
      console.log(`Langfuse: ${traces} Traces für ${cand.id}`);
      const failedUnits = new Set(combined.filter((e) => !e.passed).map((e) => e.unitId));
      const unitsPassing = units.filter((u) => !failedUnits.has(u.id)).length;

      // Ein Reparatur-Durchgang: durchgefallene Fragen ersetzen, mit demselben Modell, von beiden Richtern bewertet.
      const byUnit = new Map<string, QuestionEval[]>();
      for (const e of combined) byUnit.set(e.unitId, [...(byUnit.get(e.unitId) ?? []), e]);
      const plans = units
        .map((unit) => ({ unit, plan: planFromEvals(unit, byUnit.get(unit.id) ?? []) }))
        .filter((i) => i.plan.replacements > 0);
      const repaired = new Map<string, GeneratedUnit["questions"]>();
      const repairedUnits: GeneratedUnit[] = [];
      await pool(plans, async ({ unit, plan }) => {
        const r = await generate(cand, buildRepairPrompt(unit, plan), "questions");
        cost.repair += r.usd;
        const qs = parseRepairQuestions(r.text);
        if (qs) {
          const annotated = annotateRepairQuestions(unit, qs, 1);
          repaired.set(unit.id, annotated);
          repairedUnits.push({ ...unit, questions: annotated });
        }
      });
      let publishable = unitsPassing;
      if (repairedUnits.length) {
        const rj = await bothJudges(repairedUnits);
        cost.judgeOpenai += rj.openaiUsd;
        cost.judgeClaude += rj.claudeUsd;
        const { combined: newEvals } = combineJudges(rj.o, rj.cl);
        for (const { unit, plan } of plans) {
          const qs = repaired.get(unit.id);
          if (qs && applyRepair(unit, plan, qs, newEvals).publishable) publishable += 1;
        }
      }

      const total = cost.generation + cost.repair + cost.judgeOpenai + cost.judgeClaude;
      const n = Math.max(1, units.length);
      const mO = judgeMeans(j.o);
      const mC = judgeMeans(j.cl);
      models.push({
        model: cand.id,
        provider: cand.provider,
        units: units.length,
        failedChunks,
        questions: combined.length,
        judges: { openai: mO, claude: mC, mean: meanOfJudges(mO, mC) },
        disagreement,
        questionPassRate: Math.round((combined.filter((e) => e.passed).length / Math.max(1, combined.length)) * 1000) / 1000,
        unitPassRate: Math.round((unitsPassing / n) * 1000) / 1000,
        unitsPublishable: publishable,
        unitsDiscarded: units.length - publishable,
        costUsd: { ...cost, total },
        usdPerUnit: units.length ? Math.round((total / units.length) * 1e4) / 1e4 : null,
        eurPerUnit: units.length ? Math.round((total / USD_PER_EUR / units.length) * 1e4) / 1e4 : null,
        // Zwei Beispiele im Volltext: bevorzugt Einheiten, die ohne Reparatur bestanden haben.
        examples: [...units.filter((u) => !failedUnits.has(u.id)), ...units.filter((u) => failedUnits.has(u.id))].slice(0, 2),
      });
    } catch (e) {
      if (e instanceof BudgetExceeded) {
        aborted = `${e.message}; Kandidat ${cand.id} und alle folgenden fehlen im Bericht.`;
        break;
      }
      // SIN-445: Ein Fehler bei einem Kandidaten verwirft nicht die bezahlten Ergebnisse der anderen.
      const error = compactApiError(e instanceof Error ? e.message : String(e));
      failed.push({ model: cand.id, provider: cand.provider, error });
      console.error(`Kandidat ${cand.id} gescheitert: ${error}`);
    }
  }

  const report: AlleReport = {
    runId,
    judges: { openai: JUDGE_MODEL, claude: CLAUDE_JUDGE_MODEL },
    unitTarget: UNIT_TARGET,
    totalUsd: Math.round(totalUsd * 1e4) / 1e4,
    totalEur: Math.round((totalUsd / USD_PER_EUR) * 100) / 100,
    ...(aborted ? { aborted } : {}),
    priceNotes: [
      ...(OPENAI_CANDIDATES.some((o) => !o.priceVerified)
        ? [`Preis von ${OPENAI_CANDIDATES.filter((o) => !o.priceVerified).map((o) => o.id).join(", ")} nicht auf der Preisseite belegt: angenommen wie gpt-6.1-sol (siehe docs/decisions/SIN-437-ab-alle-modelle.md).`]
        : []),
      "Claude-Preise: Standard = 2× Batch-Preis (cost-guard). Alle Modelle ohne Batch, ohne Cache.",
    ],
    models,
    ...(failed.length ? { failed } : {}),
    published: false,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${runId}-alle-report.json`), JSON.stringify(report, null, 2));
  writeFileSync(join(REPORT_DIR, `ab-alle-modelle-${runId.slice(0, 10)}.md`), renderAlleMarkdown(report));
  console.log(JSON.stringify({ ...report, models: report.models.map((m) => ({ ...m, examples: m.examples.length })) }, null, 2));
  await flushLangfuseOtel().catch(() => undefined);
  if (aborted) process.exit(3);
  // Nur wenn kein Kandidat durchlief, gilt der Lauf als gescheitert (Bericht liegt trotzdem vor).
  if (!models.length && failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
