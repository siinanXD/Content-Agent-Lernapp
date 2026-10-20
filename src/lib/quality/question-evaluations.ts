import type { EvaluateResult } from "./schemas";

/** One judge result for one question — append-only (table question_evaluations, AP-19). */
export type QuestionEvaluationRecord = {
  id: string;
  questionId: string;
  unitId: string;
  courseId: string;
  runId: string;
  judgeModel: string;
  promptVersion: string;
  quellentreue: 0 | 1;
  eindeutigkeit: 0 | 1;
  niveau: number;
  sprache: number;
  sicherheitFlag: boolean;
  passed: boolean;
  reason?: string;
  langfuseTraceId?: string;
  /** SIN-260: Hash des bewerteten Frageninhalts; fehlt bei Altzeilen. */
  contentHash?: string;
  createdAt: string;
};

/**
 * SIN-808: Eine Kennung je Frage. Der Richter bekommt `${unitId}-${q.id}` (EvalItem.id), `questions.id` ist nur `q.id`.
 * Gespeichert und verglichen wird immer `q.id`; Altzeilen mit Einheiten-Präfix werden beim Lesen mitgenommen.
 */
export function frageId(unitId: string, questionId: string): string {
  // SIN-899: Manche Kurse haben das Präfix schon in `questions.id` (LF5-4-u8-q1), der Richter setzt es noch einmal davor.
  // Darum wiederholt entfernen, damit beide Seiten auf dieselbe Form kommen.
  const prefix = `${unitId}-`;
  let id = questionId;
  while (id.startsWith(prefix) && id.length > prefix.length) id = id.slice(prefix.length);
  return id;
}

/** Schlüssel (Einheit, Frage) für die Zuordnung Bewertung ↔ Frage. */
export function frageSchluessel(unitId: string, questionId: string): string {
  return `${unitId}\u0000${frageId(unitId, questionId)}`;
}

/** Split a course-level EvaluateResult into one record per judged question. */
export function toQuestionEvaluationRecords(
  result: EvaluateResult,
  now = new Date().toISOString(),
  hashes?: ReadonlyMap<string, string>,
): QuestionEvaluationRecord[] {
  const runId = result.runId ?? crypto.randomUUID();
  return result.questions.map((q) => ({
    id: crypto.randomUUID(),
    questionId: frageId(q.unitId, q.questionId),
    unitId: q.unitId,
    courseId: result.courseId,
    runId,
    judgeModel: result.modelId ?? `fixture:${result.mode}`,
    promptVersion: result.promptVersion ?? "unknown",
    quellentreue: q.scores.sourceFidelity,
    eindeutigkeit: q.scores.uniqueness,
    niveau: q.scores.niveau,
    sprache: q.scores.language,
    sicherheitFlag: q.scores.safetyFlag,
    passed: q.passed,
    reason: q.reasons.length ? q.reasons.join("; ") : undefined,
    langfuseTraceId: result.langfuseTraceId,
    contentHash: hashes?.get(q.questionId),
    createdAt: now,
  }));
}

/** Latest record per (course, unit, question) — mirrors the SQL view question_quality_latest. */
export function latestPerQuestion(
  records: QuestionEvaluationRecord[],
): QuestionEvaluationRecord[] {
  const latest = new Map<string, QuestionEvaluationRecord>();
  for (const r of records) {
    const key = `${r.courseId}\u0000${frageSchluessel(r.unitId, r.questionId)}`;
    const prev = latest.get(key);
    if (!prev || r.createdAt >= prev.createdAt) latest.set(key, r);
  }
  return [...latest.values()];
}
