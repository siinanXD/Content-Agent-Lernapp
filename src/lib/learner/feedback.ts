import type { PathQuestion } from "@/lib/learner/playable-path";

/** Richtige Antwort als Text, für alle 5 Fragetypen gleich dargestellt. */
export function correctAnswerText(q: PathQuestion): string {
  if (q.type === "zuordnen" && q.pairs?.length) {
    return q.pairs.map(([l, r]) => `${l} → ${r}`).join("; ");
  }
  if (q.type === "reihenfolge" && q.steps?.length) {
    return q.steps.map((s, i) => `${i + 1}. ${s}`).join(" ");
  }
  return Array.isArray(q.correct) ? q.correct.join(", ") : q.correct;
}
