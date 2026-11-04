import { loadAllCurricula } from "@/lib/content/curriculum";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { mapTitlesFromCurriculum, pickMapTitles, type MapTitles } from "./modul-block";

/** Map des Kurses für Titel und Reihenfolge (SIN-1513); ohne Treffer oder Kursdateien `undefined`. */
export function mapTitlesForUnits(units: Pick<GeneratedUnit, "id">[]): MapTitles | undefined {
  try {
    return pickMapTitles(
      units.map((u) => u.id),
      loadAllCurricula().map(mapTitlesFromCurriculum),
    );
  } catch {
    return undefined;
  }
}
