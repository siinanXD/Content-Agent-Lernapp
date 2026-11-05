import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { nurVeroeffentlicht } from "@/lib/generate/staging";
import {
  frageSchluessel,
  latestPerQuestion,
  type QuestionEvaluationRecord,
} from "@/lib/quality/question-evaluations";
import { merkerBlendetAus } from "./sicherheits-merker";

/**
 * SIN-395: Verworfene Fragen (letzte Bewertung nicht bestanden) werden nie ausgespielt.
 * SIN-808: Fragen mit Sicherheits-Flag werden ebenfalls ausgeblendet, auch wenn sie bestanden sind.
 * SIN-1541: Das gilt nur noch für Einheiten, bei denen `merkerBlendetAus` zutrifft (Sicherheitsblock der Map);
 * nicht bestandene Fragen bleiben immer verworfen.
 * Alle Lernwege (Lernpfad, Einheit, Wiederholung, Prüfung) lesen ihre Fragen aus den Einheiten,
 * die diese Funktion vorher filtert. Fragen ohne Bewertung bleiben (Bewertungslauf läuft nach).
 */
export function discardedQuestionKeys(
  evaluations: QuestionEvaluationRecord[],
  merkerBlendetAus: (unitId: string) => boolean = () => true,
): Set<string> {
  return new Set(
    latestPerQuestion(evaluations)
      .filter((r) => !r.passed || (r.sicherheitFlag && merkerBlendetAus(r.unitId)))
      .map((r) => frageSchluessel(r.unitId, r.questionId)),
  );
}

export function dropDiscardedQuestions(
  allUnits: GeneratedUnit[],
  evaluations: QuestionEvaluationRecord[],
): GeneratedUnit[] {
  // SIN-628: Entwürfe und nur geprüfte Einheiten sind für Lernende nie sichtbar.
  const units = nurVeroeffentlicht(allUnits);
  const discarded = discardedQuestionKeys(evaluations, merkerBlendetAus(units));
  if (discarded.size === 0) return units;
  return units
    .map((u) => ({
      ...u,
      questions: (u.questions ?? []).filter((q) => !discarded.has(frageSchluessel(u.id, q.id))),
    }))
    .filter((u) => u.questions.length > 0);
}
