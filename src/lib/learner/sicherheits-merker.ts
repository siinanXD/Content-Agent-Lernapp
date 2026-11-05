import { loadAllCurricula } from "@/lib/content/curriculum";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { deriveModuleBlock, mapTitlesFromCurriculum, pickMapTitles } from "./modul-block";

/**
 * SIN-1541 (Annahme: Option 2 aus SIN-1517): Ein Sicherheits-Merker des Richters blendet eine Frage nur noch aus,
 * wenn sie in einem Block mit `safety: true` der Map liegt. Der einzige Schalter: `SICHERHEITS_MERKER=alle` stellt
 * den Stand von vor diesem Issue her (jeder Merker blendet aus, SIN-808), z. B. wenn Sinan Option 1 wählt.
 */
export function merkerNurInSicherheitsbloecken(): boolean {
  return process.env.SICHERHEITS_MERKER !== "alle";
}

/**
 * Prüft je Einheit, ob ein Merker sie ausblendet. Ohne Schalter oder ohne passende Map blendet jeder Merker aus
 * (sicherer Rückfall); Blöcke, die die Map nicht kennt, zählen als Sicherheitsblock.
 */
export function merkerBlendetAus(units: Pick<GeneratedUnit, "id">[]): (unitId: string) => boolean {
  if (!merkerNurInSicherheitsbloecken()) return () => true;
  try {
    const curricula = loadAllCurricula();
    const titles = curricula.map(mapTitlesFromCurriculum);
    const best = pickMapTitles(units.map((u) => u.id), titles);
    const curriculum = best && curricula[titles.indexOf(best)];
    if (!curriculum) return () => true;
    const blocks = new Map(curriculum.modules.flatMap((m) => m.blocks.map((b) => [b.id, b.safety === true] as const)));
    return (unitId) => blocks.get(deriveModuleBlock(unitId)?.blockId ?? "") ?? true;
  } catch {
    return () => true;
  }
}
