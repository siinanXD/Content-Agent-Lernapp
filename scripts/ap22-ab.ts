/**
 * AP-22 / SIN-219 — A/B: Haiku 4.5 vs Sonnet 5.5 auf 20 LF3-Einheiten (Message Batches).
 *
 * Gleiche Prompts, gleicher gecachter System-Präfix. Richter gpt-5.4-mini. Misst echte
 * Batch-`usage` inkl. cache_creation/cache_read. Veröffentlicht nichts (nur Bericht als JSON).
 *
 * Usage:
 *   npm run ap22:ab
 *   npm run ap22:ab -- --dry-run
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  chunkPrompt,
  collectBatchUnits,
  pollBatchUntilDone,
  submitChunkTargets,
  UNITS_PER_CHUNK,
  type BatchChunkTarget,
} from "../src/lib/generate/batch-generate";
import { didaktikSchemaHint, variantRules } from "../src/lib/generate/didaktik-prompts";
import type { GeneratedUnit } from "../src/lib/generate/maf-lernfeld-seed";
import { loadMafCurriculum } from "../src/lib/content/curriculum";
import { KNOWN_GENERATOR_MODELS } from "../src/lib/anthropic/client";
import {
  addOpenAIUsage,
  claudeBatchUsd,
  emptyLedger,
  type CostLedger,
} from "../src/lib/quality/cost-guard";
import {
  JUDGE_MODEL,
  JUDGE_PROMPT_VERSION,
  liveJudgeWithUsage,
  type EvalItem,
} from "../src/lib/quality/evaluate-agent";
import { aggregateScores, type QuestionEval } from "../src/lib/quality/schemas";

const OUT_DIR = join(process.cwd(), "docs", "ops", "ap22-runs");
const KEYWORD = "Maschinen- und Anlagenführer";
const MODULE_ID = "LF3";
const UNIT_TARGET = 20;
/** Obergrenze für den ganzen A/B-Lauf (Issue: unter 3 €). */
const BUDGET_EUR = 3;
const USD_PER_EUR = 1.075; // konservativ: €3 ≈ $3.23
const BUDGET_USD = BUDGET_EUR * USD_PER_EUR;

const hasFlag = (n: string) => process.argv.includes(`--${n}`);

function lf3Targets(): BatchChunkTarget[] {
  const c = loadMafCurriculum();
  const mod = c.modules.find((m) => m.id === MODULE_ID);
  if (!mod) throw new Error(`Modul ${MODULE_ID} fehlt`);
  const targets: BatchChunkTarget[] = [];
  let left = UNIT_TARGET;
  for (const block of mod.blocks) {
    for (let offset = 0; offset < block.units && left > 0; offset += UNITS_PER_CHUNK) {
      const unitCount = Math.min(UNITS_PER_CHUNK, block.units - offset, left);
      targets.push({
        customId: `ab-${block.id}-u${offset}-${offset + unitCount - 1}`,
        module: mod,
        block,
        unitOffset: offset,
        unitCount,
      });
      left -= unitCount;
    }
    if (left <= 0) break;
  }
  return targets;
}

/** Identischer Präfix für beide Modelle; cache_control zeigt, was Caching im Batch bringt. */
function sharedSystem() {
  const rules = Object.values(variantRules()).join("\n");
  return [
    {
      type: "text" as const,
      text: `Du erzeugst Lerneinheiten als reines JSON. Didaktik-Regeln:\n${rules}\n${didaktikSchemaHint()}`,
      cache_control: { type: "ephemeral" as const },
    },
  ];
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

function unitPassRate(units: GeneratedUnit[], evals: QuestionEval[]) {
  const failed = new Set(evals.filter((e) => !e.passed).map((e) => e.unitId));
  const passing = units.filter((u) => !failed.has(u.id)).length;
  return { passing, total: units.length, rate: units.length ? passing / units.length : 0 };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const secrets = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() ? "PRESENT" : "MISSING",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() ? "PRESENT" : "MISSING",
  };
  const targets = lf3Targets();
  const unitCount = targets.reduce((s, t) => s + t.unitCount, 0);
  console.log("secrets", secrets, `chunks=${targets.length} units=${unitCount}`);

  // Grobe Vorab-Schätzung: ~3k Input, ~4k Output je Einheit und Modell, ~1,2k/0,2k Judge je Frage.
  const c = loadMafCurriculum();
  const preflightUsd = KNOWN_GENERATOR_MODELS.reduce(
    (sum, m) =>
      sum +
      claudeBatchUsd(m, {
        claudeInputTokens: unitCount * 3000,
        claudeOutputTokens: unitCount * 4000,
        claudeCacheCreationTokens: 0,
        claudeCacheReadTokens: 0,
      }),
    0,
  );
  const judgeUsd = 2 * unitCount * 7 * ((1200 / 1e6) * 0.75 + (200 / 1e6) * 4.5);
  console.log(`preflight ~$${(preflightUsd + judgeUsd).toFixed(2)} (Budget €${BUDGET_EUR})`);
  if (preflightUsd + judgeUsd > BUDGET_USD) throw new Error("Preflight über Budget");

  if (hasFlag("dry-run")) {
    const sample = chunkPrompt(c, targets[0]!.module, targets[0]!.block, 0, targets[0]!.unitCount, KEYWORD);
    writeFileSync(
      join(OUT_DIR, `${runId}-dry-run.json`),
      JSON.stringify({ secrets, chunks: targets.length, unitCount, promptChars: sample.length }, null, 2),
    );
    console.log("dry-run ok");
    return;
  }
  if (Object.values(secrets).includes("MISSING")) {
    writeFileSync(join(OUT_DIR, `${runId}-blocked.json`), JSON.stringify({ runId, secrets }, null, 2));
    console.error("STOP: Secrets fehlen (nur PRESENT/MISSING gemeldet)");
    process.exit(2);
  }

  const system = sharedSystem();
  const submitted = await Promise.all(
    KNOWN_GENERATOR_MODELS.map(async (model) => ({
      model,
      ...(await submitChunkTargets({ keyword: KEYWORD, targets, model, system })),
    })),
  );
  for (const s of submitted) console.log("batch", s.model, s.batchId);

  const results = [];
  let totalUsd = 0;
  for (const s of submitted) {
    await pollBatchUntilDone(s.batchId, { intervalMs: 20_000 });
    const got = await collectBatchUnits(s.batchId);
    const usd = claudeBatchUsd(s.model, got.ledger);
    totalUsd += usd;
    results.push({ model: s.model, batchId: s.batchId, got, generationUsd: usd });
    console.log(s.model, `units=${got.units.length} failedChunks=${got.failedCustomIds.length} $${usd}`);
  }
  if (totalUsd > BUDGET_USD) throw new Error(`Budget nach Generierung überschritten: $${totalUsd}`);

  const key = process.env.OPENAI_API_KEY!.trim();
  const report = [];
  for (const r of results) {
    const items = flatten(r.got.units);
    const judged = await liveJudgeWithUsage(key, items);
    const judgeLedger: CostLedger = addOpenAIUsage(
      emptyLedger(),
      judged.usage.prompt_tokens,
      judged.usage.completion_tokens,
    );
    const judgeUsd = judgeLedger.usdEstimate;
    totalUsd += judgeUsd;
    const rate = unitPassRate(r.got.units, judged.questions);
    const l = r.got.ledger;
    const passingUnits = rate.passing;
    report.push({
      model: r.model,
      batchId: r.batchId,
      units: r.got.units.length,
      failedChunks: r.got.failedCustomIds,
      unitsPassing: passingUnits,
      unitPassRate: Number(rate.rate.toFixed(3)),
      questions: judged.questions.length,
      questionPassRate: Number(
        (judged.questions.filter((q) => q.passed).length / Math.max(1, judged.questions.length)).toFixed(3),
      ),
      scores: aggregateScores(judged.questions),
      usage: {
        input: l.claudeInputTokens,
        output: l.claudeOutputTokens,
        cache_creation_input: l.claudeCacheCreationTokens,
        cache_read_input: l.claudeCacheReadTokens,
      },
      generationUsd: r.generationUsd,
      judgeUsd,
      usdPerPassingUnit: passingUnits ? Number((r.generationUsd / passingUnits).toFixed(4)) : null,
    });
  }

  const out = {
    runId,
    judge: { model: JUDGE_MODEL, promptVersion: JUDGE_PROMPT_VERSION },
    module: MODULE_ID,
    unitTarget: UNIT_TARGET,
    totalUsd: Math.round(totalUsd * 10000) / 10000,
    totalEur: Math.round((totalUsd / USD_PER_EUR) * 100) / 100,
    report,
    published: false,
  };
  writeFileSync(join(OUT_DIR, `${runId}-ab-report.json`), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
