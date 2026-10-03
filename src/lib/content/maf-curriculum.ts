import { readFileSync } from "node:fs";
import { join } from "node:path";

export type QuestionTypeMix = {
  auswahl: number;
  zuordnen: number;
  lueckentext: number;
  reihenfolge: number;
  rechnen: number;
};

export type CurriculumBlock = {
  id: string;
  title: string;
  unitBudget: number;
  aoRefs: string[];
  lfSource: string;
  examRefs: string[];
};

export type CurriculumLernfeld = {
  id: string;
  nr: number;
  title: string;
  rlpHours: number;
  unitBudget: number;
  blocks: CurriculumBlock[];
};

export type CurriculumYear = {
  year: number;
  label: string;
  rlpHours: number;
  unitBudget: number;
  aoWeeksTimed: number;
  lernfelder: CurriculumLernfeld[];
};

export type MafCurriculum = {
  id: string;
  fetchedAt: string;
  occupation: {
    durationYears: number;
    schwerpunkt: string;
  };
  unitBudgetRule: {
    divisor: number;
    year1Units: number;
    year2Units: number;
    totalLernfeldUnits: number;
  };
  questionTypeMix: QuestionTypeMix;
  axes: {
    schule: {
      year1Hours: number;
      year2Hours: number;
    };
    betrieb: {
      year1WeeksTimed: number;
      year2WeeksTimedMetall: number;
    };
  };
  examModules: {
    abschlusspruefung: {
      writtenWeights: {
        produktionstechnik: number;
        produktionsplanung: number;
        wiso: number;
      };
    };
  };
  anschlussmodul: {
    optional: boolean;
  };
  years: CurriculumYear[];
  sources: Array<{
    title: string;
    url: string;
    kind: string;
    fetchedAt: string;
  }>;
};

const JSON_PATH = join(process.cwd(), "docs/content/maf-curriculum.json");

let cached: MafCurriculum | null = null;

export function loadMafCurriculum(): MafCurriculum {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(JSON_PATH, "utf8")) as MafCurriculum;
  return cached;
}

/** Sum RLP hours for a curriculum year. */
export function sumYearRlpHours(year: CurriculumYear): number {
  return year.lernfelder.reduce((s, lf) => s + lf.rlpHours, 0);
}

/** Sum unit budgets of Lernfelder in a year. */
export function sumYearUnitBudget(year: CurriculumYear): number {
  return year.lernfelder.reduce((s, lf) => s + lf.unitBudget, 0);
}

/** Sum unit budgets of blocks within a Lernfeld. */
export function sumBlockUnitBudget(lf: CurriculumLernfeld): number {
  return lf.blocks.reduce((s, b) => s + b.unitBudget, 0);
}

export function sumQuestionTypeMix(mix: QuestionTypeMix): number {
  return (
    mix.auswahl + mix.zuordnen + mix.lueckentext + mix.reihenfolge + mix.rechnen
  );
}

export function sumExamWeights(c: MafCurriculum): number {
  const w = c.examModules.abschlusspruefung.writtenWeights;
  return w.produktionstechnik + w.produktionsplanung + w.wiso;
}
