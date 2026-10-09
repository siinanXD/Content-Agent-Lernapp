import {
  resolveExplanation,
  type QuestionLevel,
  type UnitImage,
  type UnitSections,
  type UnitVariant,
} from "@/lib/content/didaktik";
import {
  mafSeedLernfeldSicherheit,
  type GeneratedQuestion,
  type QuestionType,
} from "@/lib/generate/maf-lernfeld-seed";

export type PathUnitStatus = "done" | "today" | "open";

export type PathQuestion = {
  id: string;
  type: QuestionType;
  level: QuestionLevel;
  prompt: string;
  choices?: string[];
  pairs?: Array<[string, string]>;
  steps?: string[];
  blanks?: string[];
  correct: string | string[];
  explanation: string;
  sourceUrl: string;
  examAreas: string[];
  image?: UnitImage;
  sampleSolution?: string;
  sampleChecklist?: string[];
};

function requireLevel(level: QuestionLevel | undefined): QuestionLevel {
  return level ?? "verstehen";
}

export type PathUnit = {
  id: string;
  indexLabel: string;
  title: string;
  status: PathUnitStatus;
  statusLabel: string;
  minutes: number;
  explanation: string;
  sections?: UnitSections;
  explanationSimple?: string;
  variant: UnitVariant;
  image?: UnitImage;
  sourceLabel: string;
  moduleId: string;
  moduleTitle: string;
  blockId: string;
  blockTitle: string;
  examAreas: string[];
  questions: PathQuestion[];
};

export type PathModuleGroup = {
  moduleId: string;
  moduleTitle: string;
  blocks: Array<{
    blockId: string;
    blockTitle: string;
    units: PathUnit[];
  }>;
};

const seed = mafSeedLernfeldSicherheit();

function mapQuestions(questions: GeneratedQuestion[]): PathQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    level: requireLevel(q.level),
    prompt: q.prompt,
    choices: q.choices,
    pairs: q.pairs,
    steps: q.steps,
    blanks: q.blanks,
    correct: q.correct,
    explanation: q.explanation,
    sourceUrl: q.sourceUrl,
    examAreas: q.examAreas ?? [],
    image: q.image,
    sampleSolution: q.sampleSolution,
    sampleChecklist: q.sampleChecklist,
  }));
}

/** Figma-aligned path; questions from Sicherheit seed + didactic fields (AP-18). */
export const PLAYABLE_UNITS: PathUnit[] = [
  {
    id: "unit-01",
    indexLabel: "01",
    title: "PSA und Arbeitsplatz",
    status: "done",
    statusLabel: "Abgeschlossen",
    minutes: seed.units[0]!.minutes,
    explanation: seed.units[0]!.explanation,
    sections: seed.units[0]!.sections,
    explanationSimple: seed.units[0]!.explanationSimple,
    variant: seed.units[0]!.variant ?? "sicherheit",
    image: seed.units[0]!.image,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    moduleId: "M0",
    moduleTitle: "Querschnitt: Beruf, Betrieb, Sicherheit",
    blockId: "M0-3",
    blockTitle: "Sicherheit und Gesundheitsschutz",
    examAreas: ["WISO-1"],
    questions: mapQuestions(seed.units[0]!.questions),
  },
  {
    id: "unit-02",
    indexLabel: "02",
    title: "Gefährdungsbeurteilung",
    status: "done",
    statusLabel: "Abgeschlossen",
    minutes: seed.units[0]!.minutes,
    explanation: seed.units[0]!.explanation,
    sections: seed.units[0]!.sections,
    variant: "sicherheit",
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    moduleId: "M0",
    moduleTitle: "Querschnitt: Beruf, Betrieb, Sicherheit",
    blockId: "M0-3",
    blockTitle: "Sicherheit und Gesundheitsschutz",
    examAreas: ["WISO-1"],
    questions: mapQuestions(seed.units[0]!.questions.slice(0, 5)),
  },
  {
    id: "unit-03",
    indexLabel: "03",
    title: "Elektrische Gefahren",
    status: "today",
    statusLabel: "Teil des Tagesziels",
    minutes: 7,
    explanation: seed.units[1]!.explanation,
    sections: seed.units[1]!.sections,
    explanationSimple: seed.units[1]!.explanationSimple,
    variant: "ablauf",
    image: seed.units[1]!.image,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    moduleId: "M0",
    moduleTitle: "Querschnitt: Beruf, Betrieb, Sicherheit",
    blockId: "M0-3",
    blockTitle: "Sicherheit und Gesundheitsschutz",
    examAreas: ["WISO-1"],
    questions: mapQuestions(seed.units[1]!.questions).map((q, i) => ({
      ...q,
      id: `e${i + 1}`,
    })),
  },
  {
    id: "unit-04",
    indexLabel: "04",
    title: "Not-Aus und Verriegelung",
    status: "today",
    statusLabel: "Teil des Tagesziels",
    minutes: seed.units[1]!.minutes,
    explanation: seed.units[1]!.explanation,
    sections: seed.units[1]!.sections,
    variant: "ablauf",
    image: seed.units[1]!.image,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    moduleId: "LF1",
    moduleTitle: "Fertigen von Bauelementen mit handgeführten Werkzeugen",
    blockId: "LF1-1",
    blockTitle: "Planen und Vorbereiten",
    examAreas: ["PT-a", "PT-c"],
    questions: mapQuestions(seed.units[1]!.questions).map((q, i) => ({
      ...q,
      id: `n${i + 1}`,
      examAreas: ["PT-a", "PT-c"],
    })),
  },
  {
    id: "unit-05",
    indexLabel: "05",
    title: "Ergonomie am Arbeitsplatz",
    status: "open",
    statusLabel: "Noch offen",
    minutes: 8,
    explanation: seed.units[2]!.explanation,
    sections: seed.units[2]!.sections,
    variant: "standard",
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    moduleId: "LF1",
    moduleTitle: "Fertigen von Bauelementen mit handgeführten Werkzeugen",
    blockId: "LF1-2",
    blockTitle: "Fertigen und Prüfen",
    examAreas: ["PT-e"],
    questions: mapQuestions(seed.units[2]!.questions).map((q, i) => ({
      ...q,
      id: `r${i + 1}`,
      examAreas: ["PT-e", "WISO-1"],
    })),
  },
  {
    id: "unit-06",
    indexLabel: "06",
    title: "Brandschutz Grundlagen",
    status: "open",
    statusLabel: "Noch offen",
    minutes: 8,
    explanation: seed.units[2]!.explanation,
    sections: seed.units[2]!.sections,
    variant: "sicherheit",
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    moduleId: "PA",
    moduleTitle: "Produktionsanlagen bedienen und warten",
    blockId: "PA-1",
    blockTitle: "In Betrieb nehmen",
    examAreas: ["PT-d"],
    questions: mapQuestions(seed.units[2]!.questions.slice(0, 5)).map((q, i) => ({
      ...q,
      id: `b${i + 1}`,
      examAreas: ["PT-d", "WISO-1"],
    })),
  },
];

export const PLAYABLE_TODAY = {
  goal: "Fällige Wiederholungen zuerst, dann neue Einheiten · Sicherheit",
  occupation: "Maschinen- und Anlagenführer · Prüfungsvorbereitung",
  nextTitle: "Not-Aus und Verriegelung",
};

/** Active path: Phase A snapshot when present (AP-15), else Sicherheit seed. */
export function activePathUnits(): PathUnit[] {
  try {
    // Lazy require avoids circular import at module init.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { phaseAPathUnits } = require("./phase-a-path") as {
      phaseAPathUnits: () => PathUnit[];
    };
    return phaseAPathUnits();
  } catch {
    return PLAYABLE_UNITS;
  }
}

export function getUnit(id: string): PathUnit | undefined {
  return activePathUnits().find((u) => u.id === id);
}

export function getQuestionById(id: string): PathQuestion | undefined {
  for (const u of activePathUnits()) {
    const q = u.questions.find((item) => item.id === id);
    if (q) return q;
  }
  return undefined;
}

export function groupUnitsByModule(units: PathUnit[] = activePathUnits()): PathModuleGroup[] {
  const modules = new Map<string, PathModuleGroup>();
  for (const unit of units) {
    let mod = modules.get(unit.moduleId);
    if (!mod) {
      mod = { moduleId: unit.moduleId, moduleTitle: unit.moduleTitle, blocks: [] };
      modules.set(unit.moduleId, mod);
    }
    let block = mod.blocks.find((b) => b.blockId === unit.blockId);
    if (!block) {
      block = { blockId: unit.blockId, blockTitle: unit.blockTitle, units: [] };
      mod.blocks.push(block);
    }
    block.units.push(unit);
  }
  return [...modules.values()];
}

/** Modul des Kurses für den Lernpfad: `units` ist 0, solange die Content-Fabrik es noch nicht gefüllt hat. */
export type PathModuleEntry = PathModuleGroup & { units: number };

/**
 * Alle Module des Kurses in Kurs-Reihenfolge, auch ohne Einheiten (SIN-452). Module mit Einheiten
 * kommen aus `groups`; Gruppen, die der Kurs nicht kennt (Seed), folgen am Ende.
 */
export function withEmptyModules(
  groups: PathModuleGroup[],
  modules: Array<{ id: string; title: string }>,
): PathModuleEntry[] {
  const byId = new Map(groups.map((g) => [g.moduleId, g]));
  const entry = (g: PathModuleGroup): PathModuleEntry => ({
    ...g,
    units: g.blocks.reduce((n, b) => n + b.units.length, 0),
  });
  const known = new Set(modules.map((m) => m.id));
  return [
    ...modules.map((m) => {
      const g = byId.get(m.id);
      return g ? entry(g) : { moduleId: m.id, moduleTitle: m.title, blocks: [], units: 0 };
    }),
    ...groups.filter((g) => !known.has(g.moduleId)).map(entry),
  ];
}

export function unitExplanation(unit: PathUnit, simpleLanguage: boolean): string {
  return resolveExplanation(unit, simpleLanguage);
}
