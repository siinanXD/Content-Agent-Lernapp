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
  type TrafficLight,
} from "@/lib/content/didaktik";
import { tabelleFuerKurs } from "@/lib/content/pruefungsgebiete";
import { examCatalogForCourse, MAF_COURSE_ID, type CatalogExamPart } from "@/lib/learner/exam-catalog";
import type { PathQuestion, PathUnit } from "@/lib/learner/playable-path";

export type ExamPartView = {
  id: string;
  title: string;
  bereich: string;
  form: CatalogExamPart["form"];
  /** Dauer laut Map, `null` wenn die Map keine Minuten nennt (Fachaufgabe, praktischer Teil). */
  durationMinutes: number | null;
  /** Dauer im Wortlaut der Map, für Teile ohne Minuten. */
  durationText: string | null;
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
  /** `null`: im Gebiet wurde nichts geprüft, es gibt keine Ampel. */
  light: TrafficLight | null;
  label: string;
  /** Soll-Fragen und im Kurs vorhandene Fragen des Gebiets, wenn bekannt. */
  quota?: number;
  available?: number;
};

/** Prüfungsteile des Kurses; Kurs ohne freigegebene Map (Industriemechaniker) hat keine, nie die MAF-Prüfung. */
export function listExamParts(courseId: string | null = null): ExamPartView[] {
  return (examCatalogForCourse(courseId) ?? []).map((p) => {
    const durationMinutes = parseDurationMinutes(p.duration);
    const simulated = p.form === "schriftlich";
    return {
      id: p.id,
      title: `${p.part}: ${p.bereich}`,
      bereich: p.bereich,
      form: p.form,
      durationMinutes,
      durationText: p.duration ?? null,
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

export type ExamAreaPlan = {
  id: string;
  title: string;
  /** Soll-Anzahl nach Gewicht des Gebiets. */
  quota: number;
  /** Im Kurs vorhandene Fragen des Gebiets. */
  available: number;
  /** In die Prüfung genommen: `min(quota, available)`. */
  taken: number;
};

export type ExamPool = {
  questions: PathQuestion[];
  /** Soll-Anzahl laut Katalog; `questions` ist kürzer, wenn der Kurs nicht genug hergibt. */
  target: number;
  areas: ExamAreaPlan[];
};

/** Verteilt `total` nach Gewicht (größter Rest zuerst, bei Gleichstand das frühere Gebiet). */
function shares(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (total * w) / sum);
  const quotas = exact.map(Math.floor);
  const byRest = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = total - quotas.reduce((a, b) => a + b, 0); k > 0; k--) quotas[byRest[k - 1]![1]]!++;
  return quotas;
}

/** Jedes Gebiet bekommt mindestens eine Frage (wenn das Soll reicht), der Rest nach Gewicht. */
function apportion(total: number, weights: number[]): number[] {
  const floor = total >= weights.length ? 1 : 0;
  return shares(total - floor * weights.length, weights).map((q) => q + floor);
}

/**
 * Fragen eines Teils aus den übergebenen Einheiten (veröffentlichter Kurs), nach Gewicht der Gebiete verteilt
 * (Gewicht = Einheiten je Gebiet laut Zuordnung, SIN-1534). Jede Frage höchstens einmal und nur im ersten
 * passenden Gebiet; nie aufgefüllt, nie aus Beispieldaten, Fragen ohne Gebiet zählen nicht (SIN-1536).
 */
export function buildExamPool(
  partId: string,
  units: PathUnit[],
  courseId: string | null = null,
): ExamPool | null {
  const part = examCatalogForCourse(courseId)?.find((p) => p.id === partId);
  if (!part || part.form !== "schriftlich") return null;
  const target = examQuestionTarget(part.id, parseDurationMinutes(part.duration));
  const table = tabelleFuerKurs(courseId ?? MAF_COURSE_ID);
  const quotas = apportion(
    target,
    part.gebiete.map((g) => table?.gebiete[g.id]?.einheiten ?? 1),
  );
  const buckets = new Map<string, PathQuestion[]>(part.gebiete.map((g) => [g.id, []]));
  const seen = new Set<string>();
  for (const q of units.flatMap((u) => u.questions)) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    const area = part.gebiete.find((g) => q.examAreas.includes(g.id));
    if (area) buckets.get(area.id)!.push({ ...q, examAreas: [area.id] });
  }
  const areas = part.gebiete.map((g, i) => {
    const available = buckets.get(g.id)!.length;
    return { id: g.id, title: g.title, quota: quotas[i]!, available, taken: Math.min(quotas[i]!, available) };
  });
  const questions = part.gebiete.flatMap((g, i) => buckets.get(g.id)!.slice(0, areas[i]!.taken));
  return { questions, target, areas };
}

export function getExamQuestions(
  partId: string,
  units: PathUnit[],
  courseId: string | null = null,
): PathQuestion[] {
  return buildExamPool(partId, units, courseId)?.questions ?? [];
}

/** Offene Aufgabe: nur Musterlösung zur Selbstkontrolle, keine Wertung (DIDAKTIK §6). */
export function isOpenTask(q: Pick<PathQuestion, "type" | "sampleSolution" | "choices">): boolean {
  return q.type === "rechnen" && Boolean(q.sampleSolution) && !q.choices?.length;
}

/** Ergebnis je Gebiet nur aus den eigenen Antworten; ein Gebiet ohne Antwort ist „nicht geprüft“. */
export function scoreByArea(
  answers: Array<{ questionId: string; correct: boolean; examAreas: string[]; open?: boolean }>,
  gebiete: Array<{ id: string; title: string; quota?: number; available?: number }>,
): AreaResult[] {
  const scored = answers.filter((a) => !a.open);
  return gebiete.map((g) => {
    const relevant = scored.filter((a) => a.examAreas.includes(g.id));
    const total = relevant.length;
    const correct = relevant.filter((a) => a.correct).length;
    const ratio = total === 0 ? 0 : correct / total;
    const light = total === 0 ? null : trafficLight(ratio);
    return {
      areaId: g.id,
      title: g.title,
      correct,
      total,
      ratio,
      light,
      label: light ? trafficLabel(light) : "nicht geprüft",
      quota: g.quota,
      available: g.available,
    };
  });
}

export function mafExamTimesSummary(): string {
  return "MAF schriftlich: PT 120 / PP 60 / WiSo 60 Minuten (MaschFüAusbV § 9).";
}
