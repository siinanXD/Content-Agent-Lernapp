import type { GeneratedLernfeld } from "@/lib/generate/maf-lernfeld-seed";
import { nurVeroeffentlicht } from "@/lib/generate/staging";
import { discardedQuestionKeys } from "@/lib/learner/discarded";
import { frageSchluessel, latestPerQuestion } from "@/lib/quality/question-evaluations";
import type { Course, QuestionEvaluationRecord } from "@/lib/storage/types";
import { pruefeVeroeffentlichung } from "./content-guard";

/**
 * SIN-796: Prüfungen vor `courses.status = published` im Workflow `content-publish`. Reine Funktion, kein Netz.
 * Geprüft wird, was Lernende sehen würden (nur veröffentlichte Einheiten). Verstöße nennen Ort und Art, nie Inhalte.
 * Leere Liste = der Kurs darf veröffentlicht werden.
 */
export type Mangel = { pruefung: "quelle" | "richter" | "verbotsliste"; ort: string; hinweis: string };

const GUARD_PRUEFUNG = {
  quelle: "quelle",
  abrufdatum: "quelle",
  inhalt: "quelle",
  "ki-kennzeichnung": "verbotsliste",
  personendaten: "verbotsliste",
  "ihk-aehnlichkeit": "verbotsliste",
  pruefhinweis: "verbotsliste",
} as const;

export function pruefeKursFuerVeroeffentlichung(course: Course, evaluations: QuestionEvaluationRecord[]): Mangel[] {
  const lf = course.generated as GeneratedLernfeld | undefined;
  const sichtbar = lf ? { ...lf, units: nurVeroeffentlicht(lf.units ?? []) } : undefined;
  // Quelle, Abrufdatum und Verbotsliste: derselbe Wächter wie in handlePublish (SIN-297).
  const mangel: Mangel[] = pruefeVeroeffentlichung({ sources: course.sources, generated: sichtbar }).map((v) => ({
    pruefung: GUARD_PRUEFUNG[v.regel],
    ort: v.ort,
    hinweis: v.hinweis,
  }));

  // Richter: jede sichtbare Frage hat eine Bewertung. Nicht bestandene und geflaggte Fragen blendet discarded.ts für
  // Lernende aus (SIN-808) und zählen nicht; ohne Bewertung wäre eine Frage ungeprüft sichtbar.
  const bewertet = new Set(latestPerQuestion(evaluations).map((r) => frageSchluessel(r.unitId, r.questionId)));
  const versteckt = discardedQuestionKeys(evaluations);
  let sichtbareFragen = 0;
  for (const u of sichtbar?.units ?? []) {
    for (const q of u.questions ?? []) {
      const key = frageSchluessel(u.id, q.id);
      if (versteckt.has(key)) continue;
      sichtbareFragen += 1;
      if (!bewertet.has(key)) mangel.push({ pruefung: "richter", ort: `Frage ${u.id}/${q.id}`, hinweis: "Keine Bewertung des Richters." });
    }
  }
  if (sichtbareFragen === 0) mangel.push({ pruefung: "richter", ort: "Kurs", hinweis: "Keine sichtbare Frage mit bestandener Bewertung." });
  return mangel;
}
