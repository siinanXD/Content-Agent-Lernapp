import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import {
  latestPerQuestion,
  type QuestionEvaluationRecord,
} from "@/lib/quality/question-evaluations";

/**
 * SIN-395: Verworfene Fragen (letzte Bewertung nicht bestanden) werden nie ausgespielt.
 * Alle Lernwege (Lernpfad, Einheit, Wiederholung, Prüfung) lesen ihre Fragen aus den Einheiten,
 * die diese Funktion vorher filtert. Fragen ohne Bewertung bleiben (Bewertungslauf läuft nach).
 */
export function discardedQuestionKeys(evaluations: QuestionEvaluationRecord[]): Set<string> {
  return new Set(
    latestPerQuestion(evaluations)
      .filter((r) => !r.passed)
      .map((r) => `${r.unitId}\u0000${r.questionId}`),
  );
}

export function dropDiscardedQuestions(
  units: GeneratedUnit[],
  evaluations: QuestionEvaluationRecord[],
): GeneratedUnit[] {
  const discarded = discardedQuestionKeys(evaluations);
  if (discarded.size === 0) return units;
  return units
    .map((u) => ({
      ...u,
      questions: (u.questions ?? []).filter((q) => !discarded.has(`${u.id}\u0000${q.id}`)),
    }))
    .filter((u) => u.questions.length > 0);
}
