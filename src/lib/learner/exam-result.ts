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

/** Schlanker Stand einer falsch beantworteten Frage für „Antworten durchgehen“. */
export function toWrongAnswer(q: PathQuestion): WrongAnswer {
  const answer =
    q.sampleSolution && !q.choices?.length
      ? q.sampleSolution
      : Array.isArray(q.correct)
        ? q.correct.join(", ")
        : q.correct;
  return { id: baseQuestionId(q.id), prompt: q.prompt, answer, explanation: q.explanation };
}

/** Schwächste Gebiete (Ampel rot), schwächstes zuerst. */
export function weakestAreas(areas: AreaResult[], limit = 2): AreaResult[] {
  return areas
    .filter((a) => a.light === "red")
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);
}
