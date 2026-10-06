import { createHash } from "node:crypto";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import type { CourseStorage } from "@/lib/storage/types";
import { emptyLedger, addOpenAIUsage, BUDGET_EUR, type CostLedger } from "./cost-guard";
import { JUDGE_MODEL, JUDGE_PROMPT_VERSION, type EvalItem } from "./evaluate-agent";
import {
  aggregateScores,
  QUALITY_THRESHOLDS,
  type EvaluateResult,
  type QuestionEval,
} from "./schemas";
import {
  latestPerQuestion,
  toQuestionEvaluationRecords,
  type QuestionEvaluationRecord,
} from "./question-evaluations";

/** SIN-260: Lauf stoppt vor dem harten Deckel von 20 € (AGENTS.md), wie ap15-regen-dropped. */
export const BACKFILL_STOP_EUR = 19;
export const BACKFILL_CHUNK = 10;

export type JudgeFn = (items: EvalItem[]) => Promise<{
  questions: QuestionEval[];
  usage: { prompt_tokens: number; completion_tokens: number };
}>;

/** Hash über alles, was die Bewertung beeinflusst (Frage, Antwort, Erklärung, Quelle, Niveau). */
export function questionContentHash(item: EvalItem): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        item.prompt,
        item.correct,
        item.explanation,
        item.sourceUrl,
        item.moduleId ?? null,
        item.year ?? null,
        item.niveauHint ?? null,
        item.safety ?? null,
      ]),
    )
    .digest("hex")
    .slice(0, 32);
}

/** Alle Fragen der gespeicherten Einheiten im Richter-Format; Modul/Jahr aus dem Lehrplan. */
export function unitsToEvalItems(
  units: GeneratedUnit[],
  yearOfModule: (moduleId: string | undefined) => 1 | 2 | 3 | undefined = () => undefined,
): EvalItem[] {
  return units.flatMap((u) =>
    u.questions.map((q) => ({
      id: `${u.id}-${q.id}`,
      unitId: u.id,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
      moduleId: u.moduleId,
      blockId: u.blockId,
      year: yearOfModule(u.moduleId),
      niveauHint: u.niveau,
      safety: u.safetyFlag,
    })),
  );
}

/**
 * Nur Fragen ohne Bewertung oder mit geändertem Inhalt. Altzeilen ohne Hash gelten als bewertet
 * (Annahme, siehe docs/decisions/SIN-260-bewertungslauf.md).
 */
export function planBackfill(
  items: EvalItem[],
  existing: QuestionEvaluationRecord[],
): { pending: EvalItem[]; skipped: number } {
  const latest = new Map(latestPerQuestion(existing).map((r) => [`${r.unitId}\u0000${r.questionId}`, r]));
  const pending = items.filter((item) => {
    const prev = latest.get(`${item.unitId}\u0000${item.id}`);
    if (!prev) return true;
    return prev.contentHash !== undefined && prev.contentHash !== questionContentHash(item);
  });
  return { pending, skipped: items.length - pending.length };
}

/** Meldung an Langfuse (best effort, von außen eingehängt; Tests nutzen eine Attrappe). */
export type BackfillReporter = {
  question?: (q: QuestionEval, ctx: { courseId: string; runId: string }) => Promise<void>;
  run?: (summary: BackfillSummary) => Promise<void>;
};

export type BackfillSummary = {
  runId: string;
  total: number;
  skipped: number;
  judged: number;
  passed: number;
  failed: number;
  /** Fragen, die wegen des Kostendeckels nicht mehr bewertet wurden. */
  remaining: number;
  ledger: CostLedger;
};

/**
 * Bewertet alle neuen/geänderten Fragen eines Kurses chunkweise, schreibt je Frage append-only
 * und je Lauf einen Ledger-Eintrag. Verworfene Fragen (passed=false) werden hier nie veröffentlicht
 * oder verändert; die Entscheidung bleibt beim Lesen von question_quality_latest.
 */
export async function runJudgeBackfill(opts: {
  storage: CourseStorage;
  courseId: string;
  items: EvalItem[];
  judge: JudgeFn;
  judgeModel?: string;
  runId?: string;
  stopEur?: number;
  chunk?: number;
  report?: BackfillReporter;
}): Promise<BackfillSummary> {
  const { storage, courseId, items, judge } = opts;
  const runId = opts.runId ?? `backfill-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const stopEur = opts.stopEur ?? BACKFILL_STOP_EUR;
  const chunk = opts.chunk ?? BACKFILL_CHUNK;
  const judgeModel = opts.judgeModel ?? JUDGE_MODEL;

  const { pending, skipped } = planBackfill(items, await storage.listQuestionEvaluations(courseId));
  let ledger = emptyLedger();
  let judged = 0;
  let passed = 0;

  for (let i = 0; i < pending.length; i += chunk) {
    if (ledger.eurEstimate >= Math.min(stopEur, BUDGET_EUR) || ledger.stopped) {
      ledger = {
        ...ledger,
        stopped: true,
        stopReason: ledger.stopReason ?? `Kostendeckel: ~€${ledger.eurEstimate} ≥ €${stopEur}`,
      };
      break;
    }
    const part = pending.slice(i, i + chunk);
    const res = await judge(part);
    ledger = addOpenAIUsage(ledger, res.usage.prompt_tokens, res.usage.completion_tokens);
    const result: EvaluateResult = {
      courseId,
      passed: res.questions.every((q) => q.passed),
      scores: aggregateScores(res.questions),
      questions: res.questions,
      threshold: QUALITY_THRESHOLDS,
      mode: "live",
      modelId: judgeModel,
      runId,
      promptVersion: JUDGE_PROMPT_VERSION,
    };
    const hashes = new Map(part.map((p) => [p.id, questionContentHash(p)]));
    await storage.appendQuestionEvaluations(
      toQuestionEvaluationRecords(result, new Date().toISOString(), hashes),
    );
    for (const q of res.questions) {
      await opts.report?.question?.(q, { courseId, runId }).catch(() => {});
    }
    judged += res.questions.length;
    passed += res.questions.filter((q) => q.passed).length;
  }

  if (judged > 0 || ledger.stopped) {
    await storage.appendJudgeRun({
      runId,
      judgeModel,
      promptVersion: JUDGE_PROMPT_VERSION,
      questionsTotal: items.length,
      questionsJudged: judged,
      questionsPassed: passed,
      openaiInputTokens: ledger.openaiInputTokens,
      openaiOutputTokens: ledger.openaiOutputTokens,
      costUsd: ledger.usdEstimate,
      costEur: ledger.eurEstimate,
      stopped: ledger.stopped,
      stopReason: ledger.stopReason,
    });
  }

  const summary: BackfillSummary = {
    runId,
    total: items.length,
    skipped,
    judged,
    passed,
    failed: judged - passed,
    remaining: pending.length - judged,
    ledger,
  };
  if (judged > 0 || ledger.stopped) await opts.report?.run?.(summary).catch(() => {});
  return summary;
}
