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

/** „16.10.“ aus einem ISO-Zeitpunkt (Kalendertag des Geräts). */
export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export type ReviewTileCopy = { title: string; text: string };

/**
 * Texte der Wiederholungs-Kachel im Lernpfad (SIN-368). Ohne fällige Fragen steht
 * „Heute nichts fällig“ mit dem nächsten echten Termin, nie mit einer erfundenen Zahl.
 */
export function reviewTileCopy(
  dueCount: number,
  stackCount: number,
  nextDue: string | null,
): ReviewTileCopy {
  if (dueCount > 0) {
    return {
      title: `${dueCount} ${dueCount === 1 ? "Frage" : "Fragen"} fällig`,
      text: `Stapel mit ${stackCount} ${stackCount === 1 ? "Frage" : "Fragen"}.`,
    };
  }
  if (stackCount === 0 || !nextDue) {
    return { title: "Heute nichts fällig", text: "Falsche Antworten und Anwenden-Fragen landen hier." };
  }
  return { title: "Heute nichts fällig", text: `Die nächsten Fragen kommen am ${formatDueDate(nextDue)}.` };
}
