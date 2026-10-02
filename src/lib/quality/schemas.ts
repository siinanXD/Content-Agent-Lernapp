/**
 * Quality-gate schemas (PRODUCT.md Qualität + DECISIONS D-07/D-11).
 * Thresholds block publish when failed.
 */
export type QualityScores = {
  /** 1 = answer supported by cited source; 0 = fail */
  sourceFidelity: 0 | 1;
  /** 1 = exactly one correct answer; 0 = fail */
  uniqueness: 0 | 1;
  /** 1–5; threshold ≥ 4 */
  niveau: number;
  /** 1–5; threshold ≥ 4 */
  language: number;
  /** true if topic needs human safety sample */
  safetyFlag: boolean;
};

export type QuestionEval = {
  questionId: string;
  unitId: string;
  scores: QualityScores;
  passed: boolean;
  reasons: string[];
};

export type EvaluateResult = {
  courseId: string;
  passed: boolean;
  scores: QualityScores;
  questions: QuestionEval[];
  threshold: typeof QUALITY_THRESHOLDS;
  mode: "fixture" | "live" | "langfuse-offline";
  modelId?: string;
  langfuseTraceId?: string;
  warning?: string;
};

export const QUALITY_THRESHOLDS = {
  sourceFidelity: 1 as const,
  uniqueness: 1 as const,
  niveauMin: 4 as const,
  languageMin: 4 as const,
} as const;

/** Target averages calibrated from goldset fixture (stand-in until full 70-set + live judge). */
export const GOLDSET_TARGET = {
  sourceFidelity: 1,
  uniqueness: 1,
  niveau: 4.2,
  language: 4.1,
  sampleSize: 12,
  note: "Fixture-derived targets; replace after live judge on full 70 MAF goldset in Langfuse EU",
} as const;

export function scoresPass(scores: QualityScores): boolean {
  return (
    scores.sourceFidelity >= QUALITY_THRESHOLDS.sourceFidelity &&
    scores.uniqueness >= QUALITY_THRESHOLDS.uniqueness &&
    scores.niveau >= QUALITY_THRESHOLDS.niveauMin &&
    scores.language >= QUALITY_THRESHOLDS.languageMin
  );
}

export function aggregateScores(questions: QuestionEval[]): QualityScores {
  if (questions.length === 0) {
    return {
      sourceFidelity: 0,
      uniqueness: 0,
      niveau: 0,
      language: 0,
      safetyFlag: false,
    };
  }
  const n = questions.length;
  const fidelityOk = questions.every((q) => q.scores.sourceFidelity === 1);
  const uniqueOk = questions.every((q) => q.scores.uniqueness === 1);
  const niveau =
    questions.reduce((s, q) => s + q.scores.niveau, 0) / n;
  const language =
    questions.reduce((s, q) => s + q.scores.language, 0) / n;
  return {
    sourceFidelity: fidelityOk ? 1 : 0,
    uniqueness: uniqueOk ? 1 : 0,
    niveau: Math.round(niveau * 10) / 10,
    language: Math.round(language * 10) / 10,
    safetyFlag: questions.some((q) => q.scores.safetyFlag),
  };
}
