/**
 * Prüfung · Ergebnis (Screen 21, SIN-277). Die Bestehensgrenze von 50 % ist eine Übungsgrenze,
 * keine Prognose der IHK. Offene Aufgaben haben nur eine Musterlösung, keine KI-Bewertung.
 */
import type { AreaResult } from "@/lib/learner/exam";
import type { PathQuestion } from "@/lib/learner/playable-path";

export const EXAM_PASS_RATIO = 0.5;

export type WrongAnswer = {
  id: string;
  prompt: string;
  answer: string;
  explanation: string;
};

export function examPercent(correct: number, total: number): number {
  return total <= 0 ? 0 : Math.round((correct / total) * 100);
}

export function examPassed(correct: number, total: number): boolean {
  return total > 0 && correct / total >= EXAM_PASS_RATIO;
}

/** Aufgefüllte Prüfungsfragen („…-pad-2“) wiederholen die Ursprungsfrage. */
export function baseQuestionId(id: string): string {
  return id.replace(/-pad-\d+$/, "");
}

/** Richtige Lösung als Text, je Fragetyp (Zuordnung, Reihenfolge, Lücken, Musterlösung). */
function solutionText(q: PathQuestion): string {
  if (q.sampleSolution && !q.choices?.length) return q.sampleSolution;
  if (q.pairs?.length) return q.pairs.map(([l, r]) => `${l} → ${r}`).join("; ");
  if (q.steps?.length) return q.steps.join(" → ");
  if (q.gaps?.length) return q.gaps.map((g) => g.accepted[0]).join(", ");
  return Array.isArray(q.correct) ? q.correct.join(", ") : q.correct;
}

/** Schlanker Stand einer falsch beantworteten Frage für „Antworten durchgehen“. */
export function toWrongAnswer(q: PathQuestion): WrongAnswer {
  return { id: baseQuestionId(q.id), prompt: q.prompt, answer: solutionText(q), explanation: q.explanation };
}

/** Eine Frage im Ergebnis: erst hier stehen Lösung, Erklärung und Quelle (SIN-1538). */
export type ReviewItem = WrongAnswer & {
  given: string;
  sourceUrl: string;
  /** `null`: offene Aufgabe, nur Musterlösung zur Selbstkontrolle. */
  correct: boolean | null;
  checklist?: string[];
};

export function toReviewItem(
  q: PathQuestion,
  a: { correct: boolean; given?: string; open?: boolean },
): ReviewItem {
  return {
    ...toWrongAnswer(q),
    given: a.given ?? "",
    sourceUrl: q.sourceUrl,
    correct: a.open ? null : a.correct,
    ...(a.open && q.sampleChecklist?.length ? { checklist: q.sampleChecklist } : {}),
  };
}

/** Schwächste Gebiete (Ampel rot), schwächstes zuerst. */
export function weakestAreas(areas: AreaResult[], limit = 2): AreaResult[] {
  return areas
    .filter((a) => a.light === "red")
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);
}
