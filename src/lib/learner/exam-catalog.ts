/**
 * Client-safe exam catalog (no node:fs).
 * Values mirror docs/content/maf-metall.json exam.gradedParts (MaschFüAusbV § 9).
 * Tests in exam.test.ts re-check against loadMafCurriculum().
 */

export type CatalogExamPart = {
  id: string;
  part: string;
  bereich: string;
  form: "schriftlich" | "praktisch" | "betrieblich";
  duration?: string;
  weightPercent: number | null;
  gebiete: Array<{ id: string; title: string }>;
};

/** MAF Metall written + practical parts used by Prüfungsmodus UI. */
export const MAF_EXAM_PARTS: CatalogExamPart[] = [
  {
    id: "PRAK",
    part: "Abschlussprüfung",
    bereich: "Praktischer Teil (§ 9 Abs. 2)",
    form: "praktisch",
    duration: "höchstens 7 Stunden, bis zu 2 Aufgaben",
    weightPercent: null,
    gebiete: [
      { id: "PRAK-1", title: "Einrichten, in Betrieb nehmen und Bedienen" },
      { id: "PRAK-2", title: "Umrüsten, in Betrieb nehmen und Bedienen" },
      { id: "PRAK-3", title: "Vorbeugende Instandsetzung" },
    ],
  },
  {
    id: "PT",
    part: "Abschlussprüfung schriftlich",
    bereich: "Produktionstechnik",
    form: "schriftlich",
    duration: "120 Minuten",
    weightPercent: 50,
    gebiete: [
      { id: "PT-a", title: "technische Unterlagen" },
      { id: "PT-b", title: "Werkstoffe" },
      { id: "PT-c", title: "Werkzeuge" },
      { id: "PT-d", title: "Funktion von Maschinen und Anlagen" },
      { id: "PT-e", title: "Prüfverfahren und Prüfmittel" },
      { id: "PT-f", title: "Fertigungstechniken" },
    ],
  },
  {
    id: "PP",
    part: "Abschlussprüfung schriftlich",
    bereich: "Produktionsplanung",
    form: "schriftlich",
    duration: "60 Minuten",
    weightPercent: 30,
    gebiete: [
      { id: "PP-a", title: "Planen und Steuern" },
      { id: "PP-b", title: "Qualitätsmanagement" },
      { id: "PP-c", title: "Instandhaltung" },
      { id: "PP-d", title: "Arbeitsorganisation" },
      { id: "PP-e", title: "Wirtschaftlichkeit" },
    ],
  },
  {
    id: "WISO",
    part: "Abschlussprüfung schriftlich",
    bereich: "Wirtschafts- und Sozialkunde",
    form: "schriftlich",
    duration: "60 Minuten",
    weightPercent: 20,
    gebiete: [{ id: "WISO-1", title: "Wirtschafts- und Sozialkunde" }],
  },
];

export const MAF_MAP_ID = "maf-metall";
