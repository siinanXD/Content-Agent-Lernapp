/**
 * SIN-447: Goldset Industriekaufleute. Maßstab für den Richter, bevor die Fabrik Industriekaufleute erzeugt.
 * 12 Fragen zu Verordnung und Prüfung, je 5 Fachfragen zu Phase A (M0, LF1, LF2, LF3) und 3 Gegenproben,
 * die durchfallen müssen (Feld `gegenprobe`). Geprüft durch Sinan am 09.10.2026.
 */
import goldsetJson from "../../../docs/quality/indkfl-goldset.json";
import type { GoldQuestion } from "./maf-goldset-fixture";
import type { GoldsetFile } from "./maf-goldset";

export type IndkflGoldQuestion = GoldQuestion & { moduleId: string; gegenprobe?: string };

export type IndkflGoldsetFile = Omit<GoldsetFile, "items"> & {
  status: string;
  phaseAModules: string[];
  phaseAItemsPerModule: number;
  items: IndkflGoldQuestion[];
};

export const INDKFL_GOLDSET = goldsetJson as IndkflGoldsetFile;
export const INDKFL_GOLDSET_ITEMS: IndkflGoldQuestion[] = INDKFL_GOLDSET.items;
export const LANGFUSE_INDKFL_DATASET = "indkfl-goldset";

/** Gegenproben: Fragen, die der Richter durchfallen lassen muss. */
export const indkflGegenproben = (items: IndkflGoldQuestion[] = INDKFL_GOLDSET_ITEMS) => items.filter((q) => q.gegenprobe);
