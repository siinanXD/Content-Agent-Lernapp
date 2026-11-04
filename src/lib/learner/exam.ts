/**
 * Exam mode from curriculum exam.gradedParts (AP-18c).
 * Open tasks: sample solution + checklist only — never AI graded.
 * Client-safe: uses exam-catalog (no node:fs). Server tests may sync-check the map.
 */

import {
  examQuestionTarget,
  parseDurationMinutes,
  trafficLight,
  trafficLabel,
  type ExamSet,
  type TrafficLight,
} from "@/lib/content/didaktik";
import { activePathUnits, type PathQuestion, type PathUnit } from "@/lib/learner/playable-path";
import {
  MAF_EXAM_PARTS,
  MAF_MAP_ID,
  type CatalogExamPart,
} from "@/lib/learner/exam-catalog";

export type ExamPartView = {
  id: string;
  title: string;
  bereich: string;
  form: CatalogExamPart["form"];
  durationMinutes: number | null;
  weightPercent: number | null;
  simulated: boolean;
  questionTarget: number;
  gebiete: Array<{ id: string; title: string }>;
};

export type AreaResult = {
  areaId: string;
  title: string;
  correct: number;
  total: number;
  ratio: number;
  light: TrafficLight;
  label: string;
};

/** Written graded parts only — practical / Fachaufgabe not simulated (DIDAKTIK §6). */
export function listExamParts(parts: CatalogExamPart[] = MAF_EXAM_PARTS): ExamPartView[] {
  return parts.map((p) => {
    const durationMinutes = parseDurationMinutes(p.duration);
    const simulated = p.form === "schriftlich";
    return {
      id: p.id,
      title: `${p.part}: ${p.bereich}`,
      bereich: p.bereich,
      form: p.form,
      durationMinutes,
      weightPercent: p.weightPercent,
      simulated,
      questionTarget: simulated ? examQuestionTarget(p.id, durationMinutes) : 0,
      gebiete: p.gebiete,
    };
  });
}

/** Prüfungszeit in Sekunden: angezeigte Minuten × 60, keine Abkürzung (SIN-1449). */
export function examSeconds(durationMinutes: number): number {
  return durationMinutes * 60;
}

export type ExamPool = {
  questions: PathQuestion[];
  /** Soll-Anzahl laut Katalog; `questions` ist kürzer, wenn der Kurs nicht genug hergibt. */
  target: number;
};

/**
 * Fragen eines Teils aus den übergebenen Einheiten (veröffentlichter Kurs). Jede Frage höchstens einmal,
 * nie aufgefüllt, nie aus Beispieldaten.
 */
export function buildExamPool(
  partId: string,
  units: PathUnit[],
  parts: CatalogExamPart[] = MAF_EXAM_PARTS,
): ExamPool | null {
  const part = parts.find((p) => p.id === partId);
  if (!part || part.form !== "schriftlich") return null;
  const target = examQuestionTarget(part.id, parseDurationMinutes(part.duration));
  const areaIds = new Set<string>([part.id, ...part.gebiete.map((g) => g.id)]);
  const seen = new Set<string>();
  const tagged: PathQuestion[] = [];
  const untagged: PathQuestion[] = [];
  for (const q of units.flatMap((u) => u.questions)) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    if (q.examAreas.length === 0) untagged.push(q);
    else if (q.examAreas.some((a) => areaIds.has(a) || a === "WISO-1")) tagged.push(q);
  }
  // Echte Kursfragen tragen oft kein Prüfungsgebiet: sie füllen (ohne Kopien) nach den gekennzeichneten auf.
  const questions = [...tagged, ...untagged];
  return { questions: questions.slice(0, target), target };
}

export function buildExamSet(
  partId: string,
  parts: CatalogExamPart[] = MAF_EXAM_PARTS,
  mapId: string = MAF_MAP_ID,
  units: PathUnit[] = activePathUnits(),
): ExamSet | null {
  const pool = buildExamPool(partId, units, parts);
  const part = parts.find((p) => p.id === partId);
  if (!pool || !part) return null;
  return {
    id: `exam-${mapId}-${part.id}`,
    mapId,
    partId: part.id,
    durationMinutes: parseDurationMinutes(part.duration) ?? 60,
    questionIds: pool.questions.map((q) => q.id),
  };
}

export function getExamQuestions(
  partId: string,
  units: PathUnit[] = activePathUnits(),
): PathQuestion[] {
  return buildExamPool(partId, units)?.questions ?? [];
}

export function scoreByArea(
  answers: Array<{ questionId: string; correct: boolean; examAreas: string[] }>,
  gebiete: Array<{ id: string; title: string }>,
): AreaResult[] {
  const areas =
    gebiete.length > 0 ? gebiete : [{ id: "ALL", title: "Gesamt" }];

  return areas.map((g) => {
    const relevant = answers.filter(
      (a) =>
        g.id === "ALL" ||
        a.examAreas.includes(g.id) ||
        a.examAreas.includes("WISO-1"),
    );
    const total = relevant.length || answers.length;
    const correct = (relevant.length ? relevant : answers).filter((a) => a.correct)
      .length;
    const ratio = total === 0 ? 0 : correct / total;
    const light = trafficLight(ratio);
    return {
      areaId: g.id,
      title: g.title,
      correct,
      total,
      ratio,
      light,
      label: trafficLabel(light),
    };
  });
}

export function mafExamTimesSummary(): string {
  return "MAF schriftlich: PT 120 / PP 60 / WiSo 60 Minuten (MaschFüAusbV § 9).";
}
