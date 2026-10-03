import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Typed loader for docs/content/maf-curriculum.json (AP-13).
 * The JSON is the contract the plan and generate agents follow (AP-14).
 * Sources are official only (AO, Anlage, KMK RLP); no IHK exam copies.
 */
export type QuestionType = "auswahl" | "zuordnen" | "lueckentext" | "reihenfolge" | "rechnen";
export type QuestionMix = Record<QuestionType, number>;

export type CurriculumSource = {
  id: string;
  title: string;
  url: string;
  kind: "ausbildungsordnung" | "rahmenlehrplan" | "pruefung" | "berufsinformation";
  fetchedAt: string;
  via: string;
};

export type CurriculumBlock = {
  id: string;
  title: string;
  units: number;
  topics: string[];
  sourceIds: string[];
  rechnen?: boolean;
  safety?: boolean;
};

export type AoPosition = {
  abschnitt: string;
  lfdNr: number;
  berufsbild: number;
  title: string;
};

export type CurriculumModule = {
  id: string;
  order: number;
  title: string;
  kind: "querschnitt" | "lernfeld" | "ao-kern" | "wiso" | "pruefung";
  year: 1 | 2;
  niveau: string;
  rlpLernfeld?: { nr: number; title: string; hours: number; sourceId: string; viaSourceId: string };
  aoPositions: AoPosition[];
  examAreas: string[];
  unitsTarget: number;
  safety: boolean;
  questionMix: QuestionMix;
  note?: string;
  blocks: CurriculumBlock[];
};

export type ZeitrahmenRow = {
  lfdNr: number[];
  berufsbild: number[];
  weeks: number | null;
  note?: string;
};

export type CurriculumPhase = {
  id: string;
  title: string;
  moduleIds: string[];
  why: string;
  unitsTarget: number;
};

export type Curriculum = {
  id: string;
  version: string;
  status: string;
  keyword: string;
  schwerpunkt: string;
  durationYears: number;
  durationNote: string;
  referenceRlp: { sourceId: string; why: string; alternatives: string[] };
  unit: {
    minutesMin: number;
    minutesMax: number;
    minutesAvg: number;
    questionsMin: number;
    questionsMax: number;
    questionTypes: QuestionType[];
    explanationWithSource: boolean;
  };
  defaultQuestionMix: QuestionMix;
  rules: string[];
  aoBerufsbild: Array<{ nr: number; title: string }>;
  aoZeitrahmen: Record<"year1" | "year2", { abschnitt: string; sourceId: string; rows: ZeitrahmenRow[] }>;
  exam: {
    zwischenpruefung: { sourceId: string; praktischMaxMinutes: number; schriftlichMaxMinutes: number };
    abschlusspruefung: {
      sourceId: string;
      praktisch: { maxMinutes: number; maxAufgaben: number; aufgaben: string[] };
      schriftlich: Array<{
        id: string;
        bereich: string;
        maxMinutes: number;
        weightPercent: number;
        gebiete: Array<{ id: string; title: string }>;
      }>;
      bestehen: string;
    };
  };
  totals: {
    modules: number;
    unitsTarget: number;
    hoursAtAvgUnit: number;
    questionsMin: number;
    questionsMax: number;
    rlpHoursYear1: number;
    rlpHoursYear2: number;
  };
  phases: CurriculumPhase[];
  modules: CurriculumModule[];
  sources: CurriculumSource[];
};

export const MAF_CURRICULUM_PATH = path.join(
  process.cwd(),
  "docs",
  "content",
  "maf-curriculum.json",
);

export function loadMafCurriculum(file: string = MAF_CURRICULUM_PATH): Curriculum {
  return JSON.parse(readFileSync(file, "utf8")) as Curriculum;
}

/** Recompute totals from modules so the stored `totals` block can be verified. */
export function curriculumTotals(c: Curriculum) {
  const unitsTarget = c.modules.reduce((s, m) => s + m.unitsTarget, 0);
  const rlpHours = (year: 1 | 2) =>
    c.modules
      .filter((m) => m.kind === "lernfeld" && m.year === year)
      .reduce((s, m) => s + (m.rlpLernfeld?.hours ?? 0), 0);
  return {
    modules: c.modules.length,
    unitsTarget,
    hoursAtAvgUnit: Math.round((unitsTarget * c.unit.minutesAvg) / 60 * 10) / 10,
    questionsMin: unitsTarget * c.unit.questionsMin,
    questionsMax: unitsTarget * c.unit.questionsMax,
    rlpHoursYear1: rlpHours(1),
    rlpHoursYear2: rlpHours(2),
  };
}

/** Modules of one generation phase, in learning order. */
export function modulesForPhase(c: Curriculum, phaseId: string): CurriculumModule[] {
  const phase = c.phases.find((p) => p.id === phaseId);
  if (!phase) return [];
  return c.modules
    .filter((m) => phase.moduleIds.includes(m.id))
    .sort((a, b) => a.order - b.order);
}

/** Resolve a block's official source URLs for the generate prompt. */
export function blockSources(c: Curriculum, block: CurriculumBlock): CurriculumSource[] {
  return block.sourceIds
    .map((id) => c.sources.find((s) => s.id === id))
    .filter((s): s is CurriculumSource => Boolean(s));
}
