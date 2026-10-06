/**
 * AP-23 / SIN-220 — Content-Fabrik: ein wöchentlicher Lauf ohne manuellen Start.
 *
 * Reihenfolge (Deckel 20 € je Lauf, Stopp bei 19 €, danach sauber beenden):
 *  a) Reparatur zuerst: verworfene Fragen (AP-21, scripts/ap15-regen-dropped.ts)
 *  b) Quellen-Monitor meldet Änderung → nur betroffene Einheiten neu
 *  c) nächstes Modul ohne veröffentlichte Einheiten (Queue aus docs/content/*.json)
 * Modell laut AP-22 (GENERATOR_MODEL), Prompt-Caching an. Richter → nur Fragen über der
 * Schwelle gehen in Supabase → Sicherheits-Stichprobe wie AP-15. Veröffentlicht wird
 * erst am Ende; fehlen Secrets, passiert nichts (kein Teil-Publish).
 *
 * Usage:
 *   COURSE_STORAGE=supabase npm run content:grow
 *   COURSE_STORAGE=supabase npm run content:grow -- --dry-run --source-report=source-report.json
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GENERATOR_MODEL } from "../src/lib/anthropic/client";
import { loadAllCurricula, loadMafCurriculum } from "../src/lib/content/curriculum";
import {
  collectBatchUnits,
  mergePhaseLernfeld,
  moduleChunks,
  pollBatchUntilDone,
  submitChunkTargets,
  submitRegenBatch,
} from "../src/lib/generate/batch-generate";
import {
  affectedUnitIds,
  affordableUnits,
  buildQueue,
  eurPerUnit,
  linearSummary,
  missingSecrets,
  nextOpenItem,
  overBudget,
  pickSafetySample,
  reportFileName,
  RUN_CAP_EUR,
  toEvalItems,
  trimTargets,
  type RunReport,
} from "../src/lib/generate/content-grow";
import { didaktikSchemaHint, variantRules } from "../src/lib/generate/didaktik-prompts";
import type { GeneratedUnit } from "../src/lib/generate/maf-lernfeld-seed";
import { MAX_QUESTIONS, MIN_PASSED_QUESTIONS, planFromEvals } from "../src/lib/generate/repair-questions";
import {
  addClaudeLedger,
  addOpenAIUsage,
  emptyLedger,
  refreshLedger,
  type CostLedger,
} from "../src/lib/quality/cost-guard";
import { JUDGE_MODEL, JUDGE_PROMPT_VERSION, liveJudgeWithUsage } from "../src/lib/quality/evaluate-agent";
import { recordEvaluationTrace } from "../src/lib/quality/langfuse-client";
import { toQuestionEvaluationRecords } from "../src/lib/quality/question-evaluations";
import { assertWithinRunCap, RunBudgetExceededError, recordRunCost } from "../src/lib/quality/run-ledger";
import {
  aggregateScores,
  QUALITY_THRESHOLDS,
  type EvaluateResult,
  type QuestionEval,
} from "../src/lib/quality/schemas";
import { getStorage } from "../src/lib/storage";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs", "ops", "content-runs");
const REPAIR_DIR = join(ROOT, "docs", "ops", "ap15-runs");
/** Kurs der Metall-Map (Phase A, D-40). Die Einheiten liegen in `courses.generated`. */
const COURSE = "e22073de-7020-4380-9002-c70d46c25e25";
const MAP_ID = "maf-metall";
const KEYWORD = "Maschinen- und Anlagenführer";

const hasFlag = (name: string) => process.argv.includes(`--${name}`);
const argValue = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

function loadHistory(): RunReport[] {
  if (!existsSync(OUT_DIR)) return [];
  return readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith("-dry-run.json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(OUT_DIR, f), "utf8")) as RunReport);
}

/** Gleicher Präfix für alle Anfragen; cache_control schaltet Prompt-Caching an (D-41). */
function cachedSystem() {
  const rules = Object.values(variantRules()).join("\n");
  return [
    {
      type: "text" as const,
      text: `Du erzeugst Lerneinheiten als reines JSON. Didaktik-Regeln:\n${rules}\n${didaktikSchemaHint()}`,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

/** Stufe a: ruft die AP-21-Reparatur auf und liest deren Kosten aus dem Bericht. */
function runRepair(dry: boolean): { ran: boolean; costEur: number; budgetStop: boolean } {
  const startedAt = Date.now();
  const args = ["--import", "tsx", "scripts/ap15-regen-dropped.ts", ...(dry ? ["--dry-run"] : [])];
  const r = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  // 3 = Deckel der Reparatur erreicht, 4 = weniger als 280 Einheiten (kein Fehler).
  if (r.status !== 0 && r.status !== 3 && r.status !== 4) {
    throw new Error(`Reparatur (AP-21) endete mit Exit ${r.status}`);
  }
  let costEur = 0;
  if (existsSync(REPAIR_DIR)) {
    const reports = readdirSync(REPAIR_DIR)
      .filter((f) => f.endsWith("-repair-report.json"))
      .map((f) => join(REPAIR_DIR, f))
      .filter((p) => statSync(p).mtimeMs >= startedAt);
    for (const p of reports) {
      costEur += (JSON.parse(readFileSync(p, "utf8")) as { ledger?: { eurEstimate?: number } }).ledger?.eurEstimate ?? 0;
    }
  }
  return { ran: true, costEur, budgetStop: r.status === 3 };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const dry = hasFlag("dry-run");
  const runId = new Date().toISOString().replace(/[:.]/g, "-");

  const missing = missingSecrets(process.env);
  if (missing.length) {
    console.error(`::error::Secrets fehlen: ${missing.join(", ")} — nichts erzeugt, nichts veröffentlicht`);
    process.exit(2);
  }

  const storage = getStorage();
  if (storage.backend !== "supabase") {
    console.error("::error::COURSE_STORAGE=supabase nötig (Mock veröffentlicht nichts)");
    process.exit(2);
  }
  const course = await storage.getCourse(COURSE);
  if (!course) {
    console.error("::error::Kurs fehlt:", COURSE);
    process.exit(2);
  }
  const priorUnits = (course.generated as { units?: GeneratedUnit[] } | undefined)?.units ?? [];
  const published = new Set(priorUnits.map((u) => u.id));

  const history = loadHistory();
  const discarded = new Set(history.flatMap((r) => r.discardedUnitIds));
  const handledChanges = new Set(history.flatMap((r) => r.sourceRefresh.changeKeys));
  const resumeModuleId = [...history].reverse().find((r) => r.mode === "live")?.resumeModuleId ?? null;
  const perUnit = eurPerUnit(
    history
      .filter((r) => r.generated > 0)
      .map((r) => ({ costEur: r.costEur, unitsGenerated: r.generated })),
  );

  const queue = buildQueue(loadAllCurricula());
  const sourceReportPath = argValue("source-report");
  const sourceReport = sourceReportPath && existsSync(sourceReportPath)
    ? (JSON.parse(readFileSync(sourceReportPath, "utf8")) as Parameters<typeof affectedUnitIds>[0])
    : null;
  const affected = affectedUnitIds(sourceReport, MAP_ID, priorUnits, handledChanges);
  const next = nextOpenItem(queue, published, discarded, resumeModuleId);

  const report: RunReport = {
    runId,
    mode: dry ? "dry-run" : "live",
    startedAt: new Date().toISOString(),
    mapId: next?.item.mapId ?? null,
    moduleId: next?.item.module.id ?? null,
    nextModuleId: null,
    resumeModuleId: null,
    generated: 0,
    passed: 0,
    discarded: 0,
    discardedUnitIds: [],
    deferred: 0,
    repair: { ran: false, costEur: 0 },
    sourceRefresh: { units: affected.unitIds.length, replaced: 0, changeKeys: [] },
    model: GENERATOR_MODEL,
    costEur: 0,
    capEur: RUN_CAP_EUR,
    stopReason: null,
    safetySampleUnitIds: [],
    batchIds: [],
  };

  console.log(
    JSON.stringify({
      dry,
      model: GENERATOR_MODEL,
      perUnitEur: Number(perUnit.toFixed(4)),
      publishedUnits: published.size,
      resumeModuleId,
      sourceRefreshUnits: affected.unitIds.length,
      nextModule: next ? `${next.item.mapId}/${next.item.module.id}` : null,
      pendingUnits: next?.pending.length ?? 0,
    }),
  );

  const finish = (code = 0) => {
    report.costEur = Math.round(report.costEur * 100) / 100;
    writeFileSync(join(OUT_DIR, reportFileName(report)), JSON.stringify(report, null, 2) + "\n");
    writeFileSync(join(ROOT, "content-run-summary.md"), linearSummary(report) + "\n");
    console.log(linearSummary(report));
    process.exit(code);
  };

  // Stufe a: Reparatur zuerst.
  const repair = runRepair(dry);
  report.repair = { ran: !dry, costEur: repair.costEur };
  const spent = repair.costEur;
  if (repair.budgetStop || overBudget(spent)) {
    report.costEur = spent;
    report.stopReason = "Deckel in der Reparatur erreicht; Rest im nächsten Lauf";
    report.resumeModuleId = resumeModuleId;
    report.moduleId = null;
    report.mapId = null;
    report.nextModuleId = next?.item.module.id ?? null;
    return finish(0);
  }

  if (dry) {
    const cap = affordableUnits(spent, perUnit);
    const trimmed = next
      ? trimTargets(moduleChunks(next.item.module), new Set(next.pending), cap)
      : null;
    report.generated = trimmed?.units ?? 0;
    report.deferred = trimmed?.leftOver ?? 0;
    report.nextModuleId = next?.item.module.id ?? null;
    report.resumeModuleId = report.deferred > 0 ? (next?.item.module.id ?? null) : null;
    report.stopReason = "dry-run: kein API-Aufruf, nichts veröffentlicht";
    return finish(0);
  }

  const openaiKey = process.env.OPENAI_API_KEY!.trim();
  const curriculum = loadMafCurriculum();
  let ledger: CostLedger = emptyLedger();
  const spentTotal = () => spent + refreshLedger(ledger).eurEstimate;
  const allEvals: QuestionEval[] = [];
  const live: GeneratedUnit[] = [];

  async function judge(units: GeneratedUnit[], label: string): Promise<QuestionEval[]> {
    const judged = await liveJudgeWithUsage(
      openaiKey,
      toEvalItems(units.map((unit) => ({ unit, questions: unit.questions })), curriculum),
    );
    ledger = addOpenAIUsage(ledger, judged.usage.prompt_tokens, judged.usage.completion_tokens);
    allEvals.push(...judged.questions);
    const result: EvaluateResult = {
      courseId: COURSE,
      passed: judged.questions.every((q) => q.passed),
      scores: aggregateScores(judged.questions),
      questions: judged.questions,
      threshold: QUALITY_THRESHOLDS,
      mode: "live",
      modelId: JUDGE_MODEL,
      runId: `${runId}-${label}`,
      promptVersion: JUDGE_PROMPT_VERSION,
    };
    await storage.appendQuestionEvaluations(toQuestionEvaluationRecords(result));
    return judged.questions;
  }

  /** Nur Fragen über der Schwelle bleiben; Einheit live ab MIN_PASSED_QUESTIONS (AP-21). */
  function keepPassing(units: GeneratedUnit[], evals: QuestionEval[]): { ok: GeneratedUnit[]; dropped: string[] } {
    const ok: GeneratedUnit[] = [];
    const dropped: string[] = [];
    for (const u of units) {
      const plan = planFromEvals(u, evals.filter((e) => e.unitId === u.id));
      if (plan.kept.length >= MIN_PASSED_QUESTIONS) ok.push({ ...u, questions: plan.kept.slice(0, MAX_QUESTIONS) });
      else dropped.push(u.id);
    }
    return { ok, dropped };
  }

  // Stufe b: Quellen geändert → nur betroffene Einheiten neu. Alte Fassung bleibt, wenn die neue durchfällt.
  const refreshIds = affected.unitIds.slice(0, affordableUnits(spentTotal(), perUnit));
  report.sourceRefresh.units = refreshIds.length;
  // SIN-258: Vor jedem bezahlten Batch prüfen; bei Überschreitung des Deckels stoppt der Lauf sauber.
  const capStop = (e: unknown) => {
    if (!(e instanceof RunBudgetExceededError)) throw e;
    report.stopReason = `Deckel erreicht (${e.message}); Rest im nächsten Lauf`;
  };
  try {
  if (refreshIds.length > 0) {
    assertWithinRunCap(spentTotal(), RUN_CAP_EUR);
    const specs = refreshIds.map((id) => {
      const u = priorUnits.find((x) => x.id === id)!;
      return { moduleId: u.moduleId ?? id.split("-")[0]!, blockId: u.blockId ?? id.replace(/-u\d+$/, ""), unitId: id, titleHint: u.title };
    });
    const sub = await submitRegenBatch({ keyword: KEYWORD, unitSpecs: specs });
    report.batchIds.push(sub.batchId);
    await pollBatchUntilDone(sub.batchId, { intervalMs: 30_000 });
    const got = await collectBatchUnits(sub.batchId);
    ledger = addClaudeLedger(ledger, got.ledger);
    if (got.units.length > 0) {
      const { ok } = keepPassing(got.units, await judge(got.units, "refresh"));
      live.push(...ok);
      report.sourceRefresh.replaced = ok.length;
    }
    report.sourceRefresh.changeKeys = affected.changeKeys;
  }

  } catch (e) {
    capStop(e);
  }

  // Stufe c: nächstes Modul, so viel der Deckel erlaubt.
  const generatedUnits: GeneratedUnit[] = [];
  try {
  if (report.stopReason) {
    report.deferred = next?.pending.length ?? 0;
  } else if (next && !overBudget(spentTotal())) {
    const { targets, units, leftOver } = trimTargets(
      moduleChunks(next.item.module),
      new Set(next.pending),
      affordableUnits(spentTotal(), perUnit),
    );
    report.deferred = leftOver;
    if (targets.length === 0) {
      report.stopReason = "Deckel: keine Einheit mehr bezahlbar; Rest im nächsten Lauf";
    } else {
      assertWithinRunCap(spentTotal(), RUN_CAP_EUR);
      const sub = await submitChunkTargets({ keyword: KEYWORD, targets, system: cachedSystem() });
      report.batchIds.push(sub.batchId);
      console.log("Batch", sub.batchId, "Einheiten", units, "Modell", GENERATOR_MODEL);
      await pollBatchUntilDone(sub.batchId, { intervalMs: 30_000 });
      const got = await collectBatchUnits(sub.batchId);
      ledger = addClaudeLedger(ledger, got.ledger);
      // Nur Einheiten, die zum Modul gehören und noch offen sind.
      const wanted = new Set(next.pending);
      generatedUnits.push(...got.units.filter((u) => wanted.has(u.id)));
      const evals = generatedUnits.length > 0 ? await judge(generatedUnits, "grow") : [];
      const { ok, dropped } = keepPassing(generatedUnits, evals);
      live.push(...ok);
      const gotIds = new Set(generatedUnits.map((u) => u.id));
      // Nie gelieferte Einheiten (Batch-Fehler) zählen als verworfen, damit der Lauf nicht ewig daran hängt.
      const missingIds = targets.flatMap((t) =>
        Array.from({ length: t.unitCount }, (_, i) => `${t.block.id}-u${t.unitOffset + i + 1}`),
      ).filter((id) => wanted.has(id) && !gotIds.has(id));
      report.generated = generatedUnits.length;
      report.passed = ok.length;
      report.discardedUnitIds = [...dropped, ...missingIds];
      report.discarded = report.discardedUnitIds.length;
    }
  } else if (next) {
    report.stopReason = "Deckel erreicht; Modul kommt im nächsten Lauf";
    report.deferred = next.pending.length;
  }
  } catch (e) {
    capStop(e);
  }

  // Veröffentlichen: erst jetzt, alles in einem Schritt.
  const liveIds = new Set(live.map((u) => u.id));
  if (live.length > 0) {
    const merged = mergePhaseLernfeld([...priorUnits.filter((u) => !liveIds.has(u.id)), ...live]);
    await storage.setGenerated(COURSE, merged);
    await storage.setStatus(COURSE, "published");
  }

  const sample = pickSafetySample(live);
  report.safetySampleUnitIds = sample.map((u) => u.id);
  report.costEur = spentTotal();
  if (overBudget(report.costEur) && !report.stopReason) report.stopReason = "Deckel erreicht";

  // Nach dem Lauf: wie geht es weiter?
  const publishedAfter = new Set([...published, ...liveIds]);
  const discardedAfter = new Set([...discarded, ...report.discardedUnitIds]);
  const after = nextOpenItem(queue, publishedAfter, discardedAfter, report.deferred > 0 ? next?.item.module.id : null);
  report.nextModuleId = after?.item.module.id ?? null;
  report.resumeModuleId = report.deferred > 0 ? (next?.item.module.id ?? null) : null;

  // SIN-258: Kosten des Laufs ins Ledger (Supabase) und als Trace an Langfuse.
  try {
    const cost = await recordRunCost({
      runId,
      courseId: COURSE,
      kind: "content-grow",
      ledger,
      totalEur: report.costEur,
      capEur: RUN_CAP_EUR,
    });
    if (cost.stopped && !report.stopReason) report.stopReason = cost.stopReason ?? "Deckel erreicht";
  } catch (e) {
    console.error("::warning::Kosten-Ledger nicht geschrieben:", e instanceof Error ? e.message : e);
  }

  const scores = aggregateScores(allEvals);
  report.langfuseTraceId =
    (await recordEvaluationTrace({
      name: "ap23-content-grow",
      courseId: COURSE,
      passed: live.length > 0,
      scores: {
        sourceFidelity: scores.sourceFidelity,
        uniqueness: scores.uniqueness,
        niveau: scores.niveau,
        language: scores.language,
        safetyFlag: scores.safetyFlag,
      },
      metadata: {
        moduleId: report.moduleId,
        generated: report.generated,
        passed: report.passed,
        discarded: report.discarded,
        costEur: report.costEur,
        model: GENERATOR_MODEL,
        batchIds: report.batchIds.join("+"),
      },
    })) ?? undefined;

  finish(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
