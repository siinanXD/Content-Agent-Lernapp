import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { nurVeroeffentlicht } from "@/lib/generate/staging";
import {
  frageSchluessel,
  latestPerQuestion,
  type QuestionEvaluationRecord,
} from "@/lib/quality/question-evaluations";

/**
 * SIN-395: Verworfene Fragen (letzte Bewertung nicht bestanden) werden nie ausgespielt.
 * SIN-808: Fragen mit Sicherheits-Flag werden ebenfalls ausgeblendet, auch wenn sie bestanden sind.
 * Alle Lernwege (Lernpfad, Einheit, Wiederholung, Prüfung) lesen ihre Fragen aus den Einheiten,
 * die diese Funktion vorher filtert. Fragen ohne Bewertung bleiben (Bewertungslauf läuft nach).
 */
export function discardedQuestionKeys(evaluations: QuestionEvaluationRecord[]): Set<string> {
  return new Set(
    latestPerQuestion(evaluations)
      .filter((r) => !r.passed || r.sicherheitFlag)
      .map((r) => frageSchluessel(r.unitId, r.questionId)),
  );
}

export function dropDiscardedQuestions(
  allUnits: GeneratedUnit[],
  evaluations: QuestionEvaluationRecord[],
): GeneratedUnit[] {
  // SIN-628: Entwürfe und nur geprüfte Einheiten sind für Lernende nie sichtbar.
  const units = nurVeroeffentlicht(allUnits);
  const discarded = discardedQuestionKeys(evaluations);
  if (discarded.size === 0) return units;
  return units
    .map((u) => ({
      ...u,
      questions: (u.questions ?? []).filter((q) => !discarded.has(frageSchluessel(u.id, q.id))),
    }))
    .filter((u) => u.questions.length > 0);
}
