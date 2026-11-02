/**
 * Lernpfad-Stand aus echten Lernereignissen (SIN-1446): erledigt ist nur, wozu es ein Ereignis `unit` mit
 * Einheiten-Id gibt. Die erste Einheit, die nicht erledigt ist, ist „Jetzt“; das Tagesziel hängt nicht an der Position.
 */
import type { PathUnit } from "@/lib/learner/playable-path";
import type { LearningEvent } from "@/lib/learner/streak";

export function completedUnitIds(events: readonly LearningEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const e of events) if (e.kind === "unit" && e.unitId) ids.add(e.unitId);
  return ids;
}

export function withProgress(units: PathUnit[], done: ReadonlySet<string>): PathUnit[] {
  let nextSeen = false;
  return units.map((u) => {
    if (done.has(u.id)) return { ...u, status: "done", statusLabel: "Abgeschlossen" };
    if (!nextSeen) {
      nextSeen = true;
      return { ...u, status: "today", statusLabel: "Jetzt" };
    }
    return { ...u, status: "open", statusLabel: "Noch offen" };
  });
}
