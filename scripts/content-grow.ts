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
import { loadAllCurricula, type Curriculum } from "../src/lib/content/curriculum";
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
  chooseRunMap,
  eurPerUnit,
  linearSummary,
  MAP_COURSES,
  missingSecrets,
  nextOpenItem,
  nextOpenItems,
  nichtVersucht,
  overBudget,
  pendingSlots,
  pickSafetySample,
  reportFileName,
  RUN_CAP_EUR,
  toEvalItems,
  trimTargets,
  unitCostHistory,
  type RunReport,
} from "../src/lib/generate/content-grow";
import { generatorSystemText } from "../src/lib/generate/didaktik-prompts";
import type { BatchChunkTarget } from "../src/lib/generate/batch-generate";
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
import { flushLangfuseOtel } from "../src/lib/quality/langfuse-otel";
import { createGrowTracer } from "../src/lib/quality/grow-traces";
import {
  kurslaufSessionId,
  PROMPT_NAMEN,
  traceTitel,
} from "../src/lib/quality/langfuse-names";
import { promptLink } from "../src/lib/quality/langfuse-verwaltung";
import { toQuestionEvaluationRecords } from "../src/lib/quality/question-evaluations";
import { assertWithinRunCap, RunBudgetExceededError, recordRunCost } from "../src/lib/quality/run-ledger";
import {
  aggregateScores,
  QUALITY_THRESHOLDS,
  type EvaluateResult,
  type QuestionEval,
} from "../src/lib/quality/schemas";
import { reportPipelineError, initPipelineSentry } from "../src/lib/sentry-pipeline";
import { getStorage } from "../src/lib/storage";
import { recordFactoryRun, toAbortedRunRecord, toFactoryRunRecord } from "../src/lib/generate/factory-status";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs", "ops", "content-runs");
const REPAIR_DIR = join(ROOT, "docs", "ops", "ap15-runs");
/**
 * Kurs, Map und Stichwort des Laufs (SIN-431). Ein Lauf bedient genau eine Map; main() wählt sie
 * abwechselnd (chooseRunMap). Bis dahin gilt MAF Metall (Phase A, D-40) für Abbruch-Zeilen.
 */
let MAP_ID = "maf-metall";
let COURSE = MAP_COURSES[MAP_ID]!.courseId;
let KEYWORD = MAP_COURSES[MAP_ID]!.keyword;
let CURRICULUM: Curriculum | undefined;

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
  return [
    {
      type: "text" as const,
      text: generatorSystemText(),
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

const STARTED_AT = new Date().toISOString();
const RUN_ID = STARTED_AT.replace(/[:.]/g, "-");

/** SIN-378: Auch ein Abbruch vor dem Ergebnis hinterlässt eine Zeile mit Grund (nur Live-Läufe). Schlägt das fehl, endet der Lauf trotzdem. */
async function abortRun(reason: string, code: number): Promise<never> {
  if (!hasFlag("dry-run")) {
    try {
      await recordFactoryRun(toAbortedRunRecord(RUN_ID, COURSE, STARTED_AT, reason));
    } catch (e) {
      console.error("::warning::Fabrik-Status nicht geschrieben:", e instanceof Error ? e.message : e);
    }
  }
  process.exit(code);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const dry = hasFlag("dry-run");
  const runId = RUN_ID;

  const missing = missingSecrets(process.env);
  if (missing.length) {
    console.error(`::error::Secrets fehlen: ${missing.join(", ")} — nichts erzeugt, nichts veröffentlicht`);
    return abortRun(`Secrets fehlen: ${missing.join(", ")}`, 2);
  }

  const storage = getStorage();
  if (storage.backend !== "supabase") {
    console.error("::error::COURSE_STORAGE=supabase nötig (Mock veröffentlicht nichts)");
    return abortRun("COURSE_STORAGE=supabase nötig", 2);
  }
  const curricula = loadAllCurricula();
  const queueAll = buildQueue(curricula);

  // Kurse aller unterstützten Maps laden. Fehlt ein Kurs (Migration noch nicht angewendet), fällt
  // nur diese Map aus; fehlt der Metall-Kurs, bricht der Lauf wie bisher ab.
  const unitsByMap = new Map<string, GeneratedUnit[]>();
  for (const [mapId, mc] of Object.entries(MAP_COURSES)) {
    const c = await storage.getCourse(mc.courseId);
    if (!c) {
      console.error(`::warning::Kurs fehlt für ${mapId}: ${mc.courseId}`);
      continue;
    }
    unitsByMap.set(mapId, (c.generated as { units?: GeneratedUnit[] } | undefined)?.units ?? []);
  }
  if (!unitsByMap.has("maf-metall")) {
    console.error("::error::Kurs fehlt:", COURSE);
    return abortRun("Kurs fehlt", 2);
  }
  const publishedByMap = new Map([...unitsByMap].map(([m, us]) => [m, new Set(us.map((u) => u.id))]));

  const history = loadHistory();
  // Einheiten-IDs wiederholen sich zwischen den Maps (M0-1-u1): Verworfene gehören zur Map ihres Laufs.
  const discardedByMap = new Map<string, Set<string>>();
  for (const r of history) {
    const key = r.mapId ?? "maf-metall";
    const set = discardedByMap.get(key) ?? new Set<string>();
    r.discardedUnitIds.forEach((id) => set.add(id));
    discardedByMap.set(key, set);
  }
  const lastLive = [...history].reverse().filter((r) => r.mode === "live");
  const lastMapId = lastLive.find((r) => r.mapId)?.mapId ?? null;
  const resumeModuleId = lastLive[0]?.resumeModuleId ?? null;
  // Nur Maps mit Kurs kommen in Frage.
  const usable = queueAll.filter((q) => unitsByMap.has(q.mapId));
  const chosen = chooseRunMap(usable, publishedByMap, discardedByMap, lastMapId, resumeModuleId);
  if (chosen) MAP_ID = chosen;
  COURSE = MAP_COURSES[MAP_ID]!.courseId;
  KEYWORD = MAP_COURSES[MAP_ID]!.keyword;
  CURRICULUM = curricula.find((c) => c.id === MAP_ID);
  const priorUnits = unitsByMap.get(MAP_ID) ?? [];
  const published = publishedByMap.get(MAP_ID) ?? new Set<string>();
  const discarded = discardedByMap.get(MAP_ID) ?? new Set<string>();
  const handledChanges = new Set(history.flatMap((r) => r.sourceRefresh.changeKeys));
  // SIN-434: ohne Reparaturkosten; die zieht die Planung getrennt als `spent` ab.
  const perUnit = eurPerUnit(unitCostHistory(history));

  const queue = usable.filter((q) => q.mapId === MAP_ID);
  const sourceReportPath = argValue("source-report");
  const sourceReport = sourceReportPath && existsSync(sourceReportPath)
    ? (JSON.parse(readFileSync(sourceReportPath, "utf8")) as Parameters<typeof affectedUnitIds>[0])
    : null;
  const affected = affectedUnitIds(sourceReport, MAP_ID, priorUnits, handledChanges);
  const next = nextOpenItem(queue, published, discarded, resumeModuleId);
  // SIN-406: statt eines Moduls so viele, wie der Deckel bezahlbar macht (Obergrenze vor der Reparatur).
  const plan = nextOpenItems(queue, published, discarded, resumeModuleId, affordableUnits(0, perUnit));
  const planPending = new Set(plan.flatMap((x) => x.pending));
  const planTargets = () => plan.flatMap((x) => moduleChunks(x.item.module));
  /** Erstes Modul des Plans, in dem nach dem Abschneiden noch Einheiten offen sind (Fortsetzung). */
  const resumeFor = (selected: BatchChunkTarget[]) => {
    const done = new Set(
      selected.flatMap((t) =>
        Array.from({ length: t.unitCount }, (_, i) => `${t.block.id}-u${t.unitOffset + i + 1}`),
      ),
    );
    return plan.find((x) => x.pending.some((id) => !done.has(id)))?.item.module.id ?? null;
  };

  const report: RunReport = {
    runId,
    mode: dry ? "dry-run" : "live",
    startedAt: STARTED_AT,
    mapId: next?.item.mapId ?? null,
    moduleId: next?.item.module.id ?? null,
    moduleIds: plan.map((x) => x.item.module.id),
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
      modules: plan.map((x) => x.item.module.id),
      pendingUnits: planPending.size,
    }),
  );

  const finish = async (code = 0) => {
    report.costEur = Math.round(report.costEur * 100) / 100;
    // SIN-289: Statusdatensatz je Lauf (Live-Läufe), Grundlage für „läuft“ und „hängt“ im Planer.
    if (!dry) {
      try {
        await recordFactoryRun(toFactoryRunRecord(report, COURSE, next !== null));
      } catch (e) {
        console.error("::warning::Fabrik-Status nicht geschrieben:", e instanceof Error ? e.message : e);
        await reportPipelineError(e).catch(() => undefined);
      }
    }
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
    const trimmed = next ? trimTargets(planTargets(), planPending, cap) : null;
    report.generated = trimmed?.units ?? 0;
    report.deferred = trimmed?.leftOver ?? 0;
    report.nextModuleId = next?.item.module.id ?? null;
    report.resumeModuleId = report.deferred > 0 && trimmed ? resumeFor(trimmed.targets) : null;
    report.stopReason = "dry-run: kein API-Aufruf, nichts veröffentlicht";
    return finish(0);
  }

  const openaiKey = process.env.OPENAI_API_KEY!.trim();
  const curriculum = CURRICULUM!;
  let ledger: CostLedger = emptyLedger();
  const spentTotal = () => spent + refreshLedger(ledger).eurEstimate;
  const allEvals: QuestionEval[] = [];
  const live: GeneratedUnit[] = [];

  // SIN-380: Traces je Schritt, sofort gesendet (nicht erst am Laufende).
  const erzeugerLink = await promptLink(PROMPT_NAMEN.erzeuger);
  const common = { beruf: MAP_COURSES[MAP_ID]!.beruf, schwerpunkt: MAP_COURSES[MAP_ID]!.schwerpunkt, modul: report.moduleId ?? undefined };
  const tracer = createGrowTracer({
    runId,
    courseId: COURSE,
    common,
    generatorModel: GENERATOR_MODEL,
    judgeModel: JUDGE_MODEL,
    generatorPrompt: erzeugerLink,
    minBestanden: MIN_PASSED_QUESTIONS,
  });
  let lastJudgeTraceId: string | undefined;

  async function judge(units: GeneratedUnit[], label: string): Promise<QuestionEval[]> {
    const judged = await liveJudgeWithUsage(
      openaiKey,
      toEvalItems(units.map((unit) => ({ unit, questions: unit.questions })), curriculum),
    );
    ledger = addOpenAIUsage(ledger, judged.usage.prompt_tokens, judged.usage.completion_tokens);
    allEvals.push(...judged.questions);
    // SIN-383: ein Trace je Einheit; die Trace-ID gehört zu den Zeilen der jeweiligen Einheit.
    const traceIds = await tracer.einheiten(units, judged.questions);
    for (const id of traceIds.values()) lastJudgeTraceId = id;
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
    await storage.appendQuestionEvaluations(
      toQuestionEvaluationRecords(result).map((r) => ({ ...r, langfuseTraceId: traceIds.get(r.unitId) })),
    );
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
  // SIN-258: Kosten des Laufs ins Ledger (Supabase) und als Trace an Langfuse; SIN-380: auch bei Abbruch.
  const recordCosts = async () => {
    try {
      const cost = await recordRunCost({
        runId,
        courseId: COURSE,
        kind: "content-grow",
        ledger,
        totalEur: report.costEur,
        capEur: RUN_CAP_EUR,
        kontext: { ...common, modell: GENERATOR_MODEL },
      });
      if (cost.stopped && !report.stopReason) report.stopReason = cost.stopReason ?? "Deckel erreicht";
    } catch (e) {
      console.error("::warning::Kosten-Ledger nicht geschrieben:", e instanceof Error ? e.message : e);
    }
    await flushLangfuseOtel().catch(() => undefined);
  };
  let timedOut = false;
  const capStop = async (e: unknown) => {
    // SIN-434: Zeitlimit des Batches ist ein Stopp mit Grund im Bericht, kein Absturz.
    if (e instanceof Error && /^Batch \S+ timed out/.test(e.message)) {
      timedOut = true;
      report.stopReason = `Zeitlimit: ${e.message}; Rest im nächsten Lauf`;
      return;
    }
    if (!(e instanceof RunBudgetExceededError)) {
      report.costEur = spentTotal();
      await recordCosts();
      throw e;
    }
    report.stopReason = `Deckel erreicht (${e.message}); Rest im nächsten Lauf`;
  };
  try {
  if (refreshIds.length > 0) {
    assertWithinRunCap(spentTotal(), RUN_CAP_EUR);
    const specs = refreshIds.map((id) => {
      const u = priorUnits.find((x) => x.id === id)!;
      return { moduleId: u.moduleId ?? id.split("-")[0]!, blockId: u.blockId ?? id.replace(/-u\d+$/, ""), unitId: id, titleHint: u.title };
    });
    const sub = await submitRegenBatch({ keyword: KEYWORD, curriculum, unitSpecs: specs });
    report.batchIds.push(sub.batchId);
    await pollBatchUntilDone(sub.batchId, { intervalMs: 30_000 });
    const got = await collectBatchUnits(sub.batchId, curriculum);
    ledger = addClaudeLedger(ledger, got.ledger);
    tracer.batchFertig(got.units, got.ledger, "reparatur");
    if (got.units.length > 0) {
      const { ok } = keepPassing(got.units, await judge(got.units, "refresh"));
      live.push(...ok);
      report.sourceRefresh.replaced = ok.length;
    }
    report.sourceRefresh.changeKeys = affected.changeKeys;
  }

  } catch (e) {
    await capStop(e);
  }

  // Stufe c: nächstes Modul, so viel der Deckel erlaubt.
  const generatedUnits: GeneratedUnit[] = [];
  let deferredResume: string | null = null;
  try {
  if (report.stopReason) {
    report.deferred = planPending.size;
  } else if (next && !overBudget(spentTotal())) {
    const { targets, units, leftOver } = trimTargets(
      planTargets(),
      planPending,
      affordableUnits(spentTotal(), perUnit),
    );
    report.deferred = leftOver;
    deferredResume = leftOver > 0 ? resumeFor(targets) : null;
    report.moduleIds = plan
      .map((x) => x.item.module.id)
      .filter((id) => targets.some((t) => t.module.id === id));
    if (targets.length === 0) {
      report.stopReason = "Deckel: keine Einheit mehr bezahlbar; Rest im nächsten Lauf";
    } else {
      assertWithinRunCap(spentTotal(), RUN_CAP_EUR);
      const sub = await submitChunkTargets({ keyword: KEYWORD, curriculum, targets, system: cachedSystem() });
      report.batchIds.push(sub.batchId);
      console.log("Batch", sub.batchId, "Einheiten", units, "Modell", GENERATOR_MODEL);
      await pollBatchUntilDone(sub.batchId, { intervalMs: 30_000 });
      const got = await collectBatchUnits(sub.batchId, curriculum);
      ledger = addClaudeLedger(ledger, got.ledger);
      tracer.batchFertig(got.units, got.ledger, "neuesModul");
      // Nur Einheiten, die zum Modul gehören und noch offen sind.
      const wanted = planPending;
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
    report.deferred = planPending.size;
    deferredResume = next.item.module.id;
  }
  } catch (e) {
    await capStop(e);
  }

  // Veröffentlichen: erst jetzt, alles in einem Schritt.
  const liveIds = new Set(live.map((u) => u.id));
  if (live.length > 0) {
    const merged = mergePhaseLernfeld(
      [...priorUnits.filter((u) => !liveIds.has(u.id)), ...live],
      MAP_ID === "maf-metall"
        ? {}
        : { id: `${MAP_ID}-fabrik`, title: curriculum.title, focus: "Content-Fabrik (SIN-431)" },
    );
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
  const after = nextOpenItem(queue, publishedAfter, discardedAfter, report.deferred > 0 ? deferredResume : null);
  report.nextModuleId = after?.item.module.id ?? null;
  report.resumeModuleId = report.deferred > 0 ? (deferredResume ?? next?.item.module.id ?? null) : null;

  // SIN-434: Aufschlüsselung der nicht versuchten Einheiten.
  if (timedOut && report.generated === 0) report.deferred = Math.max(report.deferred, planPending.size);
  const none = new Set<string>();
  const otherMapOpen = usable
    .filter((q) => q.mapId !== MAP_ID)
    .reduce(
      (n, q) =>
        n + pendingSlots(q.module, publishedByMap.get(q.mapId) ?? none, discardedByMap.get(q.mapId) ?? none).length,
      0,
    );
  report.nichtVersucht = nichtVersucht(
    queue,
    publishedAfter,
    discardedAfter,
    new Set(plan.map((x) => x.item.module.id)),
    report.deferred,
    timedOut,
    otherMapOpen,
  );

  await recordCosts();

  // SIN-299: Schritte des Kurslaufs als fachlich benannte Traces in einer Session.
  // SIN-383: „erzeugen“ und „prüfen“ stehen je Einheit im Einheiten-Trace (tracer).
  const sessionId = kurslaufSessionId(runId);
  const traceBase = { courseId: COURSE, sessionId, passed: live.length > 0, scores: {} };
  const publishKontext = { ...common, schritt: "veroeffentlichen" as const, modell: GENERATOR_MODEL };
  const publishedQuestions = live.reduce((n, u) => n + u.questions.length, 0);
  const publishScores: Record<string, number> = { "Fragen veröffentlicht": publishedQuestions };
  if (publishedQuestions > 0) publishScores["Kosten je Frage (EUR)"] = Math.round((report.costEur / publishedQuestions) * 10000) / 10000;
  const zaehler = {
    generated: report.generated,
    passed: report.passed,
    discarded: report.discarded,
    costEur: report.costEur,
    batchIds: report.batchIds.join("+"),
  };
  report.langfuseTraceId = lastJudgeTraceId;
  await recordEvaluationTrace({
    ...traceBase,
    name: traceTitel(publishKontext),
    kontext: publishKontext,
    scores: publishScores,
    metadata: zaehler,
  });
  await flushLangfuseOtel().catch(() => undefined);

  finish(0);
}

initPipelineSentry("content-grow");
main().catch(async (err) => {
  console.error(err);
  await reportPipelineError(err).catch(() => undefined);
  await abortRun(err instanceof Error ? err.message : String(err), 1);
});
