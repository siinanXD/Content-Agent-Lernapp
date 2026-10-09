/**
 * SIN-437: Zwei Richter (OpenAI und Claude) je Kandidat, damit kein Anbieter sich selbst bevorzugt.
 * Eine Frage besteht nur, wenn beide Richter die unveränderte Qualitäts-Schwelle bestätigen.
 */
import type { QuestionEval } from "./schemas";

export type JudgeMeans = { sourceFidelity: number; uniqueness: number; niveau: number; language: number; passRate: number };

export type JudgeDisagreement = {
  /** Fragen, bei denen genau ein Richter besteht. */
  count: number;
  rate: number;
  questionIds: string[];
  /** Mittlere absolute Abweichung der Skalen 1–5. */
  meanAbsNiveauDiff: number;
  meanAbsLanguageDiff: number;
};

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

export function judgeMeans(evals: QuestionEval[]): JudgeMeans {
  const n = Math.max(1, evals.length);
  const sum = (f: (e: QuestionEval) => number) => evals.reduce((s, e) => s + f(e), 0) / n;
  return {
    sourceFidelity: round(sum((e) => e.scores.sourceFidelity)),
    uniqueness: round(sum((e) => e.scores.uniqueness)),
    niveau: round(sum((e) => e.scores.niveau), 2),
    language: round(sum((e) => e.scores.language), 2),
    passRate: round(sum((e) => (e.passed ? 1 : 0))),
  };
}

/** Mittelwert der beiden Richter-Schnitte (Skalen 1–5 und Bestehensquote). */
export function meanOfJudges(a: JudgeMeans, b: JudgeMeans): JudgeMeans {
  const m = (x: number, y: number, d = 3) => round((x + y) / 2, d);
  return {
    sourceFidelity: m(a.sourceFidelity, b.sourceFidelity),
    uniqueness: m(a.uniqueness, b.uniqueness),
    niveau: m(a.niveau, b.niveau, 2),
    language: m(a.language, b.language, 2),
    passRate: m(a.passRate, b.passRate),
  };
}

/**
 * Verbindet die Bewertungen derselben Fragen. Zuordnung über `questionId`; fehlt eine Frage bei einem Richter,
 * gilt sie als nicht bestanden (nicht bewertet = nicht bestätigt). Die Skalen im Ergebnis sind der Mittelwert,
 * die Quellentreue/Eindeutigkeit der strengere Wert, `passed` nur bei Bestehen beider Richter.
 */
export function combineJudges(
  openai: QuestionEval[],
  claude: QuestionEval[],
): { combined: QuestionEval[]; disagreement: JudgeDisagreement } {
  const byIdB = new Map(claude.map((e) => [e.questionId, e]));
  const ids = new Set(openai.map((e) => e.questionId));
  const combined: QuestionEval[] = [];
  const disagreeing: string[] = [];
  let niveauDiff = 0;
  let languageDiff = 0;
  let both = 0;
  for (const a of openai) {
    const b = byIdB.get(a.questionId);
    if (!b) {
      combined.push({ ...a, passed: false, reasons: [...a.reasons, "claude_richter_ohne_bewertung"] });
      continue;
    }
    both += 1;
    if (a.passed !== b.passed) disagreeing.push(a.questionId);
    niveauDiff += Math.abs(a.scores.niveau - b.scores.niveau);
    languageDiff += Math.abs(a.scores.language - b.scores.language);
    combined.push({
      questionId: a.questionId,
      unitId: a.unitId,
      scores: {
        sourceFidelity: Math.min(a.scores.sourceFidelity, b.scores.sourceFidelity) as 0 | 1,
        uniqueness: Math.min(a.scores.uniqueness, b.scores.uniqueness) as 0 | 1,
        niveau: round((a.scores.niveau + b.scores.niveau) / 2, 2),
        language: round((a.scores.language + b.scores.language) / 2, 2),
        safetyFlag: a.scores.safetyFlag || b.scores.safetyFlag,
      },
      passed: a.passed && b.passed,
      reasons: [...new Set([...a.reasons.map((r) => `openai:${r}`), ...b.reasons.map((r) => `claude:${r}`)])],
    });
  }
  for (const b of claude) if (!ids.has(b.questionId)) disagreeing.push(b.questionId);
  const total = Math.max(1, combined.length);
  return {
    combined,
    disagreement: {
      count: disagreeing.length,
      rate: round(disagreeing.length / total),
      questionIds: disagreeing,
      meanAbsNiveauDiff: round(niveauDiff / Math.max(1, both), 2),
      meanAbsLanguageDiff: round(languageDiff / Math.max(1, both), 2),
    },
  };
}

/** Auffällig: Richter stimmen bei mehr als dieser Quote der Fragen nicht überein. */
export const DISAGREEMENT_WARN_RATE = 0.2;
