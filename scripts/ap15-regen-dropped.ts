/**
 * AP-15 / SIN-193, umgebaut in AP-21 / SIN-218 — verworfene Phase-A-Einheiten reparieren.
 *
 * Neu: nicht die ganze Einheit, sondern nur die durchgefallenen Fragen werden ersetzt.
 *  1. Einheit nicht gespeichert (die 32 verworfenen aus Phase A)? Einmal komplett erzeugen
 *     und je Frage bewerten (Bootstrap; es gibt keine Frage-Bewertung aus Phase A, siehe D-37).
 *  2. Einheit + nur Fragen mit passed=false (question_quality_latest) + Grund des Richters
 *     → Claude erzeugt nur Ersatzfragen (max. 2 Runden). Der Richter bewertet nur die neuen Fragen.
 *  3. Live, wenn ≥ 5 Fragen bestanden haben, sonst bleibt die Einheit verworfen (mit Grund im Bericht).
 * Deckel: 20 € je Lauf (Stopp bei 19 €).
 *
 * Usage:
 *   COURSE_STORAGE=supabase npm run ap15:regen-dropped
 *   COURSE_STORAGE=supabase npm run ap15:regen-dropped -- --dry-run
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  collectBatchUnits,
  collectRepairQuestions,
  mergePhaseLernfeld,
  pollBatchUntilDone,
  submitQuestionRepairBatch,
  submitRegenBatch,
} from "../src/lib/generate/batch-generate";
import type {
  GeneratedQuestion,
  GeneratedUnit,
} from "../src/lib/generate/maf-lernfeld-seed";
import {
  applyRepair,
  MIN_PASSED_QUESTIONS,
  planFromEvals,
  planQuestionRepair,
  type RepairPlan,
} from "../src/lib/generate/repair-questions";
import { loadMafCurriculum, modulesForPhase } from "../src/lib/content/curriculum";
import {
  addClaudeLedger,
  addOpenAIUsage,
  BUDGET_EUR,
  compareRepairCost,
  emptyLedger,
  refreshLedger,
  type CostLedger,
} from "../src/lib/quality/cost-guard";
import {
  JUDGE_MODEL,
  JUDGE_PROMPT_VERSION,
  liveJudgeWithUsage,
  type EvalItem,
} from "../src/lib/quality/evaluate-agent";
import {
  aggregateScores,
  QUALITY_THRESHOLDS,
  type EvaluateResult,
  type QuestionEval,
} from "../src/lib/quality/schemas";
import {
  latestPerQuestion,
  toQuestionEvaluationRecords,
} from "../src/lib/quality/question-evaluations";
import { recordEvaluationTrace, langfuseConfigured } from "../src/lib/quality/langfuse-client";
import { getStorage } from "../src/lib/storage";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs", "ops", "ap15-runs");
const COURSE = "e22073de-7020-4380-9002-c70d46c25e25";
const KEYWORD = "Maschinen- und Anlagenführer";
/** Deckel gilt je Lauf (AGENTS.md: 20 € je Kurslauf); Phase-A-Kosten sind abgerechnet. */
const STOP_EUR = 19.0;
const MAX_REPAIR_ROUNDS = 2;
const PHASE_A_REPORT = "2026-10-03T15-08-17-881Z-regen-report.json";

/** Die 32 nach Phase A noch verworfenen Einheiten (docs/ops/AP15-PHASE-A.md). */
const DROPPED_FALLBACK = [
  "M0-1-u10", "LF1-9-u2", "M0-4-u3", "M0-1-u6", "M0-2-u8", "LF1-5-u1", "LF2-3-u6", "M0-1-u12",
  "LF1-6-u7", "M0-1-u11", "LF1-3-u10", "LF2-7-u8", "LF2-3-u7", "LF2-6-u1", "M0-1-u13", "M0-4-u9",
  "M0-2-u10", "LF1-9-u1", "LF1-1-u12", "LF1-9-u3", "LF2-6-u6", "M0-1-u1", "PA-4-u4", "PA-3-u5",
  "LF1-7-u2", "M0-4-u1", "M0-1-u14", "LF1-8-u6", "M0-2-u2", "M0-4-u7", "LF1-6-u2", "M0-3-u4",
] as const;

type UnitState = {
  unit: GeneratedUnit;
  plan: RepairPlan;
  /** Gründe nach der letzten Runde, falls verworfen. */
  reasons: string[];
  rounds: number;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadDroppedIds(): string[] {
  const reportPath = join(OUT_DIR, PHASE_A_REPORT);
  if (existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      droppedUnitIds?: string[];
    };
    if (report.droppedUnitIds?.length) return report.droppedUnitIds;
  }
  return [...DROPPED_FALLBACK];
}

function parseUnitId(unitId: string): {
  moduleId: string;
  blockId: string;
  unitId: string;
} | null {
  const m = unitId.match(/^([A-Za-z0-9]+)-(\d+)-u(\d+)$/i);
  if (!m) return null;
  return { moduleId: m[1]!, blockId: `${m[1]}-${m[2]}`, unitId };
}

/** Nur die übergebenen Fragen je Einheit, im Richter-Format. */
function evalItems(entries: Array<{ unit: GeneratedUnit; questions: GeneratedQuestion[] }>): EvalItem[] {
  const curriculum = loadMafCurriculum();
  return entries.flatMap(({ unit: u, questions }) => {
    const mod = curriculum.modules.find((m) => m.id === u.moduleId);
    return questions.map((q) => ({
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

function pickSafetySample(units: GeneratedUnit[], pct = 0.1): GeneratedUnit[] {
  const safety = units.filter((u) => u.safetyFlag);
  if (safety.length === 0) return [];
  const n = Math.max(1, Math.round(safety.length * pct));
  const sorted = [...safety].sort((a, b) => a.id.localeCompare(b.id, "de"));
  const step = Math.max(1, Math.floor(sorted.length / n));
  const sample: GeneratedUnit[] = [];
  for (let i = 0; i < sorted.length && sample.length < n; i += step) {
    sample.push(sorted[i]!);
  }
  return sample;
}

function budgetStop(ledger: CostLedger, label: string): boolean {
  if (ledger.eurEstimate >= STOP_EUR || ledger.stopped) {
    console.error(
      `BUDGET STOP at ${label}: run €${ledger.eurEstimate} (stop≥€${STOP_EUR}, hard €${BUDGET_EUR})`,
    );
    return true;
  }
  return false;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const dry = hasFlag("dry-run");

  const secrets = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() ? "PRESENT" : "MISSING",
    ANTHROPIC_WORKSPACE_ID: process.env.ANTHROPIC_WORKSPACE_ID?.trim() ? "PRESENT" : "MISSING",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() ? "PRESENT" : "MISSING",
    LANGFUSE: langfuseConfigured() ? "PRESENT" : "MISSING",
    SUPABASE_URL: process.env.SUPABASE_URL?.trim() ? "PRESENT" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "PRESENT" : "MISSING",
  };
  console.log("secrets", secrets);
  if (Object.values(secrets).some((v) => v === "MISSING")) {
    console.error("STOP: missing secrets");
    process.exit(2);
  }

  const storage = getStorage();
  if (storage.backend !== "supabase") {
    console.error("STOP: need COURSE_STORAGE=supabase (got", storage.backend, ")");
    process.exit(2);
  }
  const course = await storage.getCourse(COURSE);
  if (!course) {
    console.error("STOP: course missing", COURSE);
    process.exit(2);
  }

  const priorUnits = (course.generated as { units?: GeneratedUnit[] } | undefined)?.units ?? [];
  const stored = new Map(priorUnits.map((u) => [u.id, u]));
  const targetIds = loadDroppedIds();
  // Gespeicherte Einheit mit < 5 bestandenen Fragen: gezielt reparieren. Sonst: Bootstrap.
  const latest = latestPerQuestion(await storage.listQuestionEvaluations(COURSE));
  const states = new Map<string, UnitState>();
  const bootstrapIds: string[] = [];
  for (const id of targetIds) {
    const unit = stored.get(id);
    const plan = unit ? planQuestionRepair(unit, latest) : undefined;
    if (unit && plan && !plan.alreadyPublishable) {
      states.set(id, { unit, plan, reasons: [], rounds: 0 });
    } else if (!unit) {
      bootstrapIds.push(id);
    }
  }

  console.log(
    JSON.stringify({
      courseId: COURSE,
      status: course.status,
      priorUnits: priorUnits.length,
      targets: targetIds.length,
      repairFromStored: states.size,
      bootstrapFullRegen: bootstrapIds.length,
      stopEur: STOP_EUR,
    }),
  );

  if (dry) {
    writeFileSync(
      join(OUT_DIR, `${runId}-repair-dry-run.json`),
      JSON.stringify({ courseId: COURSE, targetIds, repairFromStored: [...states.keys()], bootstrapIds }, null, 2),
    );
    console.log("dry-run ok");
    return;
  }
  if (states.size === 0 && bootstrapIds.length === 0) {
    console.log("nothing to repair — already complete");
    return;
  }

  const openaiKey = process.env.OPENAI_API_KEY!.trim();
  let ledger: CostLedger = emptyLedger();
  const batchIds: string[] = [];
  const judgedCount = { questions: 0, passed: 0 };
  const allEvals: QuestionEval[] = [];

  /** Bewertet nur die übergebenen Fragen, schreibt sie append-only je Frage (AP-19). */
  async function judge(
    entries: Array<{ unit: GeneratedUnit; questions: GeneratedQuestion[] }>,
    label: string,
  ): Promise<QuestionEval[]> {
    const judged = await liveJudgeWithUsage(openaiKey, evalItems(entries));
    ledger = addOpenAIUsage(ledger, judged.usage.prompt_tokens, judged.usage.completion_tokens);
    const passedN = judged.questions.filter((q) => q.passed).length;
    judgedCount.questions += judged.questions.length;
    judgedCount.passed += passedN;
    allEvals.push(...judged.questions);
    const result: EvaluateResult = {
      courseId: COURSE,
      passed: passedN === judged.questions.length,
      scores: aggregateScores(judged.questions),
      questions: judged.questions,
      threshold: QUALITY_THRESHOLDS,
      mode: "live",
      modelId: JUDGE_MODEL,
      runId: `${runId}-${label}`,
      promptVersion: JUDGE_PROMPT_VERSION,
    };
    await storage.appendQuestionEvaluations(toQuestionEvaluationRecords(result));
    console.log(`judge ${label} pass=${passedN}/${judged.questions.length} run€=${ledger.eurEstimate}`);
    return judged.questions;
  }

  // Stufe 1: Bootstrap — nur Einheiten, die es nicht gespeichert gibt.
  if (bootstrapIds.length > 0) {
    const specs = bootstrapIds
      .map(parseUnitId)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ ...s, titleHint: s.unitId }));
    const submitted = await submitRegenBatch({ keyword: KEYWORD, unitSpecs: specs });
    batchIds.push(submitted.batchId);
    console.log("bootstrap batch", submitted.batchId, "units", submitted.chunkCount);
    await pollBatchUntilDone(submitted.batchId, { intervalMs: 20_000 });
    const collected = await collectBatchUnits(submitted.batchId);
    ledger = addClaudeLedger(ledger, collected.ledger);
    console.log(`collected new=${collected.units.length} failed=${collected.failedCustomIds.length} run€=${ledger.eurEstimate}`);
    if (budgetStop(ledger, "after-bootstrap")) process.exitCode = 3;
    else {
      const evals = await judge(
        collected.units.map((u) => ({ unit: u, questions: u.questions })),
        "bootstrap",
      );
      for (const u of collected.units) {
        const unitEvals = evals.filter((e) => e.unitId === u.id);
        const plan = planFromEvals(u, unitEvals);
        const reasons = plan.failed.map((f) => `${f.question.id}: ${f.reason}`);
        states.set(u.id, { unit: { ...u, questions: plan.kept }, plan, reasons, rounds: 0 });
      }
    }
  }

  // Stufe 2: nur durchgefallene Fragen ersetzen (max. 2 Runden).
  for (let round = 1; round <= MAX_REPAIR_ROUNDS && process.exitCode !== 3; round++) {
    const open = [...states.values()].filter(
      (s) => s.plan.replacements > 0 && !s.plan.alreadyPublishable,
    );
    if (open.length === 0) break;
    if (budgetStop(ledger, `pre-repair-${round}`)) {
      process.exitCode = 3;
      break;
    }
    const submitted = await submitQuestionRepairBatch({ items: open.map((s) => ({ unit: s.unit, plan: s.plan })) });
    batchIds.push(submitted.batchId);
    console.log(`repair ${round} batch`, submitted.batchId, "units", submitted.chunkCount);
    await pollBatchUntilDone(submitted.batchId, { intervalMs: 20_000 });
    const collected = await collectRepairQuestions(
      submitted.batchId,
      new Map(open.map((s) => [s.unit.id, s.unit])),
      round,
    );
    ledger = addClaudeLedger(ledger, collected.ledger);
    if (budgetStop(ledger, `after-repair-${round}`)) {
      process.exitCode = 3;
      break;
    }
    const entries = open
      .filter((s) => collected.questions.has(s.unit.id))
      .map((s) => ({ unit: s.unit, questions: collected.questions.get(s.unit.id)! }));
    const evals = entries.length ? await judge(entries, `repair${round}`) : [];
    for (const { unit, questions } of entries) {
      const s = states.get(unit.id)!;
      const out = applyRepair(unit, s.plan, questions, evals.filter((e) => e.unitId === unit.id));
      states.set(unit.id, { unit: out.unit, plan: out.nextPlan, reasons: out.stillFailedReasons, rounds: round });
    }
    for (const id of collected.failedCustomIds) {
      const s = states.get(id.replace(/^repair-/, ""));
      if (s) s.reasons = [...s.reasons, "Reparatur-Batch ohne verwertbare Ersatzfragen"];
    }
  }

  const live: UnitState[] = [];
  const discarded: UnitState[] = [];
  for (const s of states.values()) {
    (s.unit.questions.length >= MIN_PASSED_QUESTIONS ? live : discarded).push(s);
  }
  // Bootstrap lieferte nichts (Batch-Fehler, Budget-Stopp): als verworfen mit Grund führen.
  for (const id of bootstrapIds) {
    if (states.has(id)) continue;
    const spec = parseUnitId(id);
    discarded.push({
      unit: { id, title: id, minutes: 0, explanation: "", sourceUrl: "", sourceFetchedAt: "", questions: [], moduleId: spec?.moduleId },
      plan: { unitId: id, kept: [], failed: [], replacements: 0, alreadyPublishable: false },
      reasons: ["keine neue Fassung erzeugt (Batch-Fehler oder Budget-Stopp)"],
      rounds: 0,
    });
  }
  const liveUnits = live.map((s) => s.unit);

  const merged = mergePhaseLernfeld([...priorUnits, ...liveUnits]);
  if (liveUnits.length > 0) await storage.setGenerated(COURSE, merged);

  const scores = aggregateScores(allEvals.filter((e) => liveUnits.some((u) => u.id === e.unitId)));
  const tid = await recordEvaluationTrace({
    name: "ap21-repair-questions",
    courseId: COURSE,
    passed: liveUnits.length > 0,
    scores: {
      sourceFidelity: scores.sourceFidelity,
      uniqueness: scores.uniqueness,
      niveau: scores.niveau,
      language: scores.language,
      safetyFlag: scores.safetyFlag,
    },
    metadata: {
      phase: "A",
      unitsRepaired: liveUnits.length,
      unitsDiscarded: discarded.length,
      questionsJudged: judgedCount.questions,
      questionsPassed: judgedCount.passed,
      batchIds: batchIds.join("+"),
      costEurRun: ledger.eurEstimate,
    },
  });

  const published = merged.units.length;
  if (liveUnits.length > 0) {
    await storage.setStatus(COURSE, "published");
    writeLearnerIndex(merged.units);
  }

  const cost = compareRepairCost(refreshLedger(ledger), liveUnits.length);
  writeReport(runId, batchIds, live, discarded, ledger, cost, published, tid ?? undefined);

  console.log(
    JSON.stringify(
      {
        repaired: liveUnits.length,
        discarded: discarded.length,
        totalUnits: published,
        runEur: ledger.eurEstimate,
        costPerRepairedUnit: cost,
        batchIds,
      },
      null,
      2,
    ),
  );
  if (process.exitCode === 3 || ledger.eurEstimate >= STOP_EUR) process.exit(3);
  if (published < 280) process.exit(4);
}

function writeLearnerIndex(units: GeneratedUnit[]) {
  const modules = modulesForPhase(loadMafCurriculum(), "A").map((m) => ({ id: m.id, title: m.title }));
  const publishedAt = new Date().toISOString();
  const byModule = Object.fromEntries(
    ["M0", "LF1", "LF2", "PA"].map((m) => [m, units.filter((u) => u.moduleId === m).length]),
  );
  const base = { courseId: COURSE, keyword: KEYWORD, phase: "A", publishedAt, modules };
  writeFileSync(
    join(ROOT, "src", "lib", "learner", "phase-a-published.json"),
    JSON.stringify({ ...base, unitCount: units.length, units: [] }, null, 2),
  );
  writeFileSync(
    join(ROOT, "src", "lib", "learner", "phase-a-index.json"),
    JSON.stringify(
      {
        ...base,
        unitCount: units.length,
        targetUnits: 280,
        droppedUnits: Math.max(0, 280 - units.length),
        byModule,
        updatedAt: publishedAt,
      },
      null,
      2,
    ),
  );
  const sample = pickSafetySample(units, 0.1);
  writeFileSync(
    join(OUT_DIR, `${publishedAt.replace(/[:.]/g, "-")}-safety-sample.json`),
    JSON.stringify(
      {
        note: "10% Stichprobe nach Reparatur der Fragen (AP-21)",
        sampledAt: publishedAt,
        sampleCount: sample.length,
        unitIds: sample.map((u) => u.id),
      },
      null,
      2,
    ),
  );
}

function writeReport(
  runId: string,
  batchIds: string[],
  live: UnitState[],
  discarded: UnitState[],
  ledger: CostLedger,
  cost: ReturnType<typeof compareRepairCost>,
  published: number,
  langfuseTraceId?: string,
) {
  const l = refreshLedger(ledger);
  const report = {
    runId,
    courseId: COURSE,
    batchIds,
    unitsRepaired: live.map((s) => ({ id: s.unit.id, questions: s.unit.questions.length, rounds: s.rounds })),
    unitsDiscarded: discarded.map((s) => ({
      id: s.unit.id,
      passedQuestions: s.unit.questions.length,
      rounds: s.rounds,
      reasons: s.reasons,
    })),
    publishedTotal: published,
    ledger: l,
    costPerRepairedUnit: cost,
    langfuseTraceId,
    apiBilling: "Anthropic Console (workspace header) — not Claude Max subscription",
  };
  writeFileSync(join(OUT_DIR, `${runId}-repair-report.json`), JSON.stringify(report, null, 2));
  const fmt = (n: number | null) => (n === null ? "–" : `€${n.toFixed(3)}`);
  const lines = [
    "# AP-21 Reparatur durchgefallener Fragen",
    "",
    "**Linear:** [SIN-218](https://linear.app/sinan-kahraman/issue/SIN-218)  ",
    `**Lauf:** \`${runId}\` — Batches: ${batchIds.map((b) => `\`${b}\``).join(", ") || "–"}  `,
    `**Repariert (live):** ${live.length}  `,
    `**Begründet verworfen:** ${discarded.length}  `,
    `**Veröffentlicht gesamt:** ${published} / 280  `,
    `**Kosten Lauf:** ~€${l.eurEstimate} (Deckel €${BUDGET_EUR})  `,
    "",
    "## Kosten je reparierter Einheit",
    "",
    "| | € je Einheit |",
    "|---|---|",
    `| alt (ganze Einheit neu, Phase A) | ${fmt(cost.oldEurPerUnit)} |`,
    `| neu (nur durchgefallene Fragen) | ${fmt(cost.newEurPerUnit)} |`,
    `| Ersparnis | ${cost.savingPct === null ? "–" : `${cost.savingPct} %`} |`,
    "",
    "Hinweis: Der neue Wert enthält den einmaligen Bootstrap (komplette Neuerzeugung), weil für die 32 Einheiten keine gespeicherte Fassung und keine Frage-Bewertung existiert.",
    "",
    "## Verworfen (Grund)",
    "",
    ...(discarded.length
      ? discarded.map((s) => `- \`${s.unit.id}\` (${s.unit.questions.length}/${MIN_PASSED_QUESTIONS} bestanden): ${s.reasons.join(" | ") || "keine Ersatzfragen"}`)
      : ["–"]),
    "",
  ];
  writeFileSync(join(ROOT, "docs", "ops", "AP21-REPAIR-QUESTIONS.md"), lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
