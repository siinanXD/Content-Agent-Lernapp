import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";

export type PathUnitStatus = "done" | "today" | "open";

export type PathUnit = {
  id: string;
  indexLabel: string;
  title: string;
  status: PathUnitStatus;
  statusLabel: string;
  minutes: number;
  explanation: string;
  sourceLabel: string;
  questions: Array<{
    id: string;
    prompt: string;
    choices: string[];
    correct: string;
  }>;
};

const seed = mafSeedLernfeldSicherheit();

/** Figma-aligned path labels; questions from Sicherheit seed (no IHK copies). */
export const PLAYABLE_UNITS: PathUnit[] = [
  {
    id: "unit-01",
    indexLabel: "01",
    title: "PSA und Arbeitsplatz",
    status: "done",
    statusLabel: "Abgeschlossen",
    minutes: seed.units[0].minutes,
    explanation: seed.units[0].explanation,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    questions: toChoices(seed.units[0].questions),
  },
  {
    id: "unit-02",
    indexLabel: "02",
    title: "Gefährdungsbeurteilung",
    status: "done",
    statusLabel: "Abgeschlossen",
    minutes: seed.units[0].minutes,
    explanation: seed.units[0].explanation,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    questions: toChoices(seed.units[0].questions.slice(0, 4)),
  },
  {
    id: "unit-03",
    indexLabel: "03",
    title: "Elektrische Gefahren",
    status: "today",
    statusLabel: "Teil des Tagesziels",
    minutes: 7,
    explanation:
      "Vor Arbeiten an Anlagen gilt: spannungsfrei schalten, gegen Wiedereinschalten sichern, Spannungsfreiheit feststellen. PSA und Freigabe sind Pflicht laut MaschFüAusbV und RLP Lernfeld Sicherheit.",
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    questions: [
      {
        id: "e1",
        prompt:
          "Was ist der erste Schritt vor dem Öffnen einer Schaltschranktür unter Spannung?",
        choices: [
          "Sofort die Tür öffnen",
          "Freischalten und Spannungsfreiheit feststellen",
          "Nur Handschuhe anziehen",
          "Den Meister anrufen und warten",
        ],
        correct: "Freischalten und Spannungsfreiheit feststellen",
      },
      ...toChoices(seed.units[1].questions.slice(0, 5)).map((q, i) => ({
        ...q,
        id: `e${i + 2}`,
      })),
    ],
  },
  {
    id: "unit-04",
    indexLabel: "04",
    title: "Not-Aus und Verriegelung",
    status: "today",
    statusLabel: "Teil des Tagesziels",
    minutes: seed.units[1].minutes,
    explanation: seed.units[1].explanation,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    questions: toChoices(seed.units[1].questions),
  },
  {
    id: "unit-05",
    indexLabel: "05",
    title: "Ergonomie am Arbeitsplatz",
    status: "open",
    statusLabel: "Noch offen",
    minutes: 8,
    explanation: seed.units[2].explanation,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    questions: toChoices(seed.units[2].questions),
  },
  {
    id: "unit-06",
    indexLabel: "06",
    title: "Brandschutz Grundlagen",
    status: "open",
    statusLabel: "Noch offen",
    minutes: 8,
    explanation: seed.units[2].explanation,
    sourceLabel: "Quelle: MaschFüAusbV · KMK RLP MAF",
    questions: toChoices(seed.units[2].questions.slice(0, 4)),
  },
];

export const PLAYABLE_TODAY = {
  goal: "4 Einheiten · Sicherheit und Gesundheitsschutz",
  occupation: "Maschinen- und Anlagenführer · Prüfungsvorbereitung",
  nextTitle: "Not-Aus und Verriegelung",
};

export function getUnit(id: string): PathUnit | undefined {
  return PLAYABLE_UNITS.find((u) => u.id === id);
}

function toChoices(
  questions: Array<{
    id: string;
    prompt: string;
    choices?: string[];
    correct: string | string[];
  }>,
) {
  return questions
    .filter((q) => q.choices && q.choices.length > 0)
    .map((q) => ({
      id: q.id,
      prompt: q.prompt,
      choices: q.choices!,
      correct: Array.isArray(q.correct) ? q.correct[0]! : q.correct,
    }));
}
