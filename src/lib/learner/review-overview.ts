/**
 * Übersicht für den Wiederholungsstapel (SIN-317, Figma W6): Fragen je Stufe
 * und die Gebiete mit den meisten Fragen im Stapel. Rechnet nur aus dem lokalen Stapel.
 */
import { LEITNER_INTERVALS_DAYS } from "@/lib/content/didaktik";
import type { LeitnerStack } from "./leitner";

export type StageRow = { stage: 1 | 2 | 3 | 4; days: number; count: number };

/** Je Stufe: Abstand in Tagen (1 · 3 · 7 · 14) und Anzahl Fragen. */
export function stageRows(stack: LeitnerStack): StageRow[] {
  return ([1, 2, 3, 4] as const).map((stage) => ({
    stage,
    days: LEITNER_INTERVALS_DAYS[stage],
    count: stack.items.filter((i) => i.stage === stage).length,
  }));
}

/** Gebiete mit den meisten Fragen im Stapel, absteigend; bei Gleichstand nach Kennung. */
export function mostMissedAreas(
  areasPerQuestion: readonly (readonly string[])[],
  limit = 3,
): Array<{ areaId: string; count: number }> {
  const counts = new Map<string, number>();
  for (const areas of areasPerQuestion) {
    for (const id of new Set(areas)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts]
    .map(([areaId, count]) => ({ areaId, count }))
    .sort((a, b) => b.count - a.count || a.areaId.localeCompare(b.areaId))
    .slice(0, limit);
}

/** Frühester Fälligkeitszeitpunkt im Stapel (ISO) oder `null`, wenn der Stapel leer ist. */
export function nextDueAt(stack: LeitnerStack): string | null {
  let best: { at: string; ms: number } | null = null;
  for (const { dueAt } of stack.items) {
    const ms = typeof dueAt === "string" ? Date.parse(dueAt) : Number.NaN;
    if (Number.isNaN(ms)) continue;
    if (!best || ms < best.ms) best = { at: dueAt, ms };
  }
  return best?.at ?? null;
}
