import type { GeneratedLernfeld } from "@/lib/generate/maf-lernfeld-seed";
import { nurVeroeffentlicht } from "@/lib/generate/staging";
import { latestPerQuestion } from "@/lib/quality/question-evaluations";
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

  // Richter: jede sichtbare Frage hat als letzte Bewertung „bestanden“ (ohne Bewertung gilt als nicht bestanden).
  const letzte = new Map(latestPerQuestion(evaluations).map((r) => [`${r.unitId}\u0000${r.questionId}`, r]));
  for (const u of sichtbar?.units ?? []) {
    for (const q of u.questions ?? []) {
      const r = letzte.get(`${u.id}\u0000${q.id}`);
      if (!r) mangel.push({ pruefung: "richter", ort: `Frage ${u.id}/${q.id}`, hinweis: "Keine Bewertung des Richters." });
      else if (!r.passed) mangel.push({ pruefung: "richter", ort: `Frage ${u.id}/${q.id}`, hinweis: "Richter nicht bestanden." });
    }
  }
  return mangel;
}
