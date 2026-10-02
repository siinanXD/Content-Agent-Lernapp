export type UsageAggregate = {
  unitId: string;
  unitTitle: string;
  attempts: number;
  correctRate: number;
  avgSeconds: number;
};

export type PromptPatch = {
  unitId: string;
  reason: string;
  suggestedRule: string;
};

export type LearningLoopReport = {
  mode: "scaffold-fixture";
  weekOf: string;
  pii: false;
  weakUnits: UsageAggregate[];
  patches: PromptPatch[];
  abNote: string;
};

/** Fixture aggregates — stand-in until post-pilot analytics (no PII). */
const FIXTURE_USAGE: UsageAggregate[] = [
  {
    unitId: "unit-03",
    unitTitle: "Elektrische Gefahren",
    attempts: 120,
    correctRate: 0.54,
    avgSeconds: 95,
  },
  {
    unitId: "unit-04",
    unitTitle: "Not-Aus und Verriegelung",
    attempts: 110,
    correctRate: 0.58,
    avgSeconds: 88,
  },
  {
    unitId: "unit-02",
    unitTitle: "Gefährdungsbeurteilung",
    attempts: 140,
    correctRate: 0.61,
    avgSeconds: 70,
  },
  {
    unitId: "unit-06",
    unitTitle: "Brandschutz Grundlagen",
    attempts: 90,
    correctRate: 0.63,
    avgSeconds: 75,
  },
  {
    unitId: "unit-05",
    unitTitle: "Ergonomie am Arbeitsplatz",
    attempts: 85,
    correctRate: 0.66,
    avgSeconds: 60,
  },
  {
    unitId: "unit-01",
    unitTitle: "PSA und Arbeitsplatz",
    attempts: 150,
    correctRate: 0.82,
    avgSeconds: 55,
  },
];

export function runWeeklyLearningLoop(): LearningLoopReport {
  const weakUnits = [...FIXTURE_USAGE]
    .sort((a, b) => a.correctRate - b.correctRate)
    .slice(0, 5);

  const patches: PromptPatch[] = weakUnits.map((u) => ({
    unitId: u.unitId,
    reason: `correctRate=${u.correctRate} over ${u.attempts} attempts`,
    suggestedRule: `Für Einheit „${u.unitTitle}“: Erklärung kürzen, eine konkrete AO/RLP-Beispiellage ergänzen, Distraktoren schärfer trennen.`,
  }));

  return {
    mode: "scaffold-fixture",
    weekOf: new Date().toISOString().slice(0, 10),
    pii: false,
    weakUnits,
    patches,
    abNote:
      "A/B decision after ≥2 weeks of post-pilot traffic; write winning rules into generate prompts (no model training).",
  };
}
