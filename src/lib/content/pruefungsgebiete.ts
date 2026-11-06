/**
 * SIN-1534: Zuordnung Block → Prüfungsgebiet als Lese-Tabelle (`docs/content/zuordnung/gebiete-*.json`).
 * Eine Zeile je Block, Ausnahmen je Einheit nur dort, wo sie vom Block abweichen oder anders sicher sind.
 * Gesucht wird nach Kurs-ID: Blockkennungen wie LF1-1 kommen in mehreren Kursen vor.
 * Industriemechaniker hat keine Tabelle (Map fehlt, SIN-621) und bekommt keine Gebiete.
 */
import indkfl from "../../../docs/content/zuordnung/gebiete-indkfl.json";
import maf from "../../../docs/content/zuordnung/gebiete-maf.json";
import { deriveModuleBlock } from "@/lib/learner/modul-block";

export type GebieteTabelle = {
  kurs: string;
  courseId: string;
  stand: string;
  quelle: string;
  gebiete: Record<string, { titel: string; bereich: string; einheiten: number }>;
  bloecke: Record<string, { gebiet: string; einheiten: number; unsicher?: boolean }>;
  ausnahmen: Record<string, { gebiet: string; unsicher: boolean; grund?: string }>;
};

export type EinheitGebiet = { gebiet: string; unsicher: boolean };

export const GEBIETE_TABELLEN: GebieteTabelle[] = [maf as GebieteTabelle, indkfl as GebieteTabelle];

export function tabelleFuerKurs(courseId: string): GebieteTabelle | undefined {
  return GEBIETE_TABELLEN.find((t) => t.courseId === courseId);
}

/** Genau ein Gebiet je Einheit; unbekannter Block → `undefined` (nicht raten). */
export function gebietFuerEinheit(tabelle: GebieteTabelle, unitId: string): EinheitGebiet | undefined {
  const ausnahme = tabelle.ausnahmen[unitId];
  if (ausnahme) return { gebiet: ausnahme.gebiet, unsicher: ausnahme.unsicher };
  const block = tabelle.bloecke[deriveModuleBlock(unitId)?.blockId ?? ""];
  return block && { gebiet: block.gebiet, unsicher: block.unsicher === true };
}

/** Blöcke von Einheiten, die die Tabelle nicht kennt (Warnung statt Raten). */
export function unbekannteBloecke(tabelle: GebieteTabelle, unitIds: readonly string[]): string[] {
  return [...new Set(unitIds.filter((id) => !gebietFuerEinheit(tabelle, id)).map((id) => deriveModuleBlock(id)?.blockId ?? id))];
}
