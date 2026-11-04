/**
 * SIN-1513: Modul und Block aus der Einheiten-ID ableiten (`<Block>-u<n>`, Block = `<Modul>-<n>`),
 * Titel und Reihenfolge aus der Map des Kurses. Client-sicher (kein node:fs); die Map lädt der Server.
 */
import type { Curriculum } from "@/lib/content/curriculum";

/** Titel und Reihenfolge eines Kurses; Reihenfolge = Reihenfolge der Listen (Map). */
export type MapTitles = {
  modules: Array<{ id: string; title: string }>;
  blocks: Array<{ id: string; title: string; moduleId: string }>;
};

export function deriveModuleBlock(unitId: string): { moduleId: string; blockId: string } | undefined {
  const m = /^(.+?)-(\d+)-u\d+$/.exec(unitId);
  return m ? { moduleId: m[1]!, blockId: `${m[1]}-${m[2]}` } : undefined;
}

export function mapTitlesFromCurriculum(c: Pick<Curriculum, "modules">): MapTitles {
  const modules = [...c.modules].sort((a, b) => a.order - b.order);
  return {
    modules: modules.map((m) => ({ id: m.id, title: m.title })),
    blocks: modules.flatMap((m) => m.blocks.map((b) => ({ id: b.id, title: b.title, moduleId: m.id }))),
  };
}

/** Die Map, deren Blöcke die meisten Einheiten abdecken (mehrere Maps teilen sich Stichwort und Modul-IDs). */
export function pickMapTitles(unitIds: string[], maps: MapTitles[]): MapTitles | undefined {
  const blockIds = unitIds.map((id) => deriveModuleBlock(id)?.blockId);
  let best: MapTitles | undefined;
  let bestHits = 0;
  for (const map of maps) {
    const known = new Set(map.blocks.map((b) => b.id));
    const hits = blockIds.filter((b) => b && known.has(b)).length;
    if (hits > bestHits) {
      best = map;
      bestHits = hits;
    }
  }
  return best;
}
