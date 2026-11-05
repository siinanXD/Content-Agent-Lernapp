/**
 * Client-safe exam catalog (no node:fs).
 * Values mirror exam.gradedParts of the approved maps (`docs/content/maf-metall.json`, `indkfl.json`),
 * Gebietstitel im Wortlaut der Map (MaschFüAusbV § 9, IndKflAusbV). Tests in exam.test.ts re-check
 * Form, Dauer, Gewicht und Titel gegen die Maps.
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

export const MAF_MAP_ID = "maf-metall";
export const MAF_COURSE_ID = "e22073de-7020-4380-9002-c70d46c25e25";
export const INDKFL_COURSE_ID = "5a1f0c52-3d6e-4b8a-9e47-2c8d1b7f6a31";

/** Maschinen- und Anlagenführer (Metall): Prüfungsteile der Map. */
export const MAF_EXAM_PARTS: CatalogExamPart[] = [
  {
    id: "PRAK",
    part: "Abschlussprüfung",
    bereich: "Praktischer Teil (§ 9 Abs. 2)",
    form: "praktisch",
    duration: "höchstens 7 Stunden, bis zu 2 Aufgaben",
    weightPercent: null,
    gebiete: [
      { id: "PRAK-1", title: "Einrichten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage" },
      { id: "PRAK-2", title: "Umrüsten, in Betrieb nehmen und Bedienen einer Maschine oder Anlage" },
      { id: "PRAK-3", title: "Durchführen einer vorbeugenden Instandsetzung einschließlich der Inbetriebnahme" },
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
      { id: "PP-a", title: "Arbeitsschritte" },
      { id: "PP-b", title: "Qualitätssicherung" },
      { id: "PP-c", title: "vorbeugende Instandhaltung" },
      { id: "PP-d", title: "Produktionsanlagen" },
      { id: "PP-e", title: "Übergabeprotokoll" },
    ],
  },
  {
    id: "WISO",
    part: "Abschlussprüfung schriftlich",
    bereich: "Wirtschafts- und Sozialkunde",
    form: "schriftlich",
    duration: "60 Minuten",
    weightPercent: 20,
    gebiete: [
      { id: "WISO-1", title: "allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt" },
    ],
  },
];

/** Industriekaufmann: Prüfungsteile der Map. */
export const INDKFL_EXAM_PARTS: CatalogExamPart[] = [
  {
    id: "T1",
    part: "Teil 1",
    bereich: "Leistungserstellung, Logistik, Beschaffung und Buchhaltung",
    form: "schriftlich",
    duration: "90 Minuten",
    weightPercent: 25,
    gebiete: [
      { id: "T1-1", title: "Leistungserstellung entlang der Wertschöpfungskette planen, koordinieren, bewerten" },
      { id: "T1-2", title: "Bedarfe ermitteln, Beschaffung einleiten, Logistik- und Lagerprozesse planen und steuern" },
      { id: "T1-3", title: "Geschäftsfälle nach Grundsätzen der Buchführung und Bilanzierung prüfen und bewerten" },
      { id: "T1-4", title: "mit internen und externen Partnern zusammenarbeiten" },
      { id: "T1-5", title: "Informationsbeschaffung, Datenschutz, Datensicherheit, Digitalisierung von Geschäftsprozessen" },
    ],
  },
  {
    id: "T2A",
    part: "Teil 2",
    bereich: "Marketing, Vertrieb, Personalwesen und kaufmännische Steuerung und Kontrolle",
    form: "schriftlich",
    duration: "150 Minuten",
    weightPercent: 35,
    gebiete: [
      { id: "T2A-1", title: "Marketingmaßnahmen zielgruppenorientiert planen, umsetzen, bewerten" },
      { id: "T2A-2", title: "Vertriebsprozesse koordinieren, Kundenzufriedenheit und Kundenbindung" },
      { id: "T2A-3", title: "Personalprozesse nach Arbeits-, Sozial- und Tarifrecht planen und umsetzen" },
      { id: "T2A-4", title: "Kosten- und Leistungsrechnung, Kennzahlen, kaufmännische Steuerung, Jahresabschluss" },
      { id: "T2A-5", title: "englischsprachige Informationen und Fachbegriffe anwenden" },
    ],
  },
  {
    id: "T2B",
    part: "Teil 2",
    bereich: "Fachaufgabe im Einsatzgebiet",
    form: "betrieblich",
    duration: "Dokumentation (bis 16 Std.) und Präsentation (bis 8 Std.) vorbereiten; Präsentation bis 10 Min. und Fachgespräch zusammen 30 Min.",
    weightPercent: 30,
    gebiete: [
      { id: "T2B-1", title: "komplexe berufstypische Fachaufgabe prozessorientiert planen, durchführen, auswerten" },
      { id: "T2B-2", title: "einsatzgebietsspezifische Lösungen analysieren und begründet auswählen" },
      { id: "T2B-3", title: "Vorgehen reflektieren, dokumentieren, präsentieren, bewerten (Gewichtung 10/20/70)" },
    ],
  },
  {
    id: "T2C",
    part: "Teil 2",
    bereich: "Wirtschafts- und Sozialkunde",
    form: "schriftlich",
    duration: "60 Minuten",
    weightPercent: 10,
    gebiete: [
      { id: "WISO-1", title: "allgemeine wirtschaftliche und gesellschaftliche Zusammenhänge der Berufs- und Arbeitswelt" },
    ],
  },
];

/**
 * Prüfungsteile je Kurs. Ohne Angabe gilt der Standardkurs (MAF). Kurse ohne freigegebene Map
 * (z. B. Industriemechaniker, SIN-621) haben keinen Prüfungsmodus: `null`, nie die MAF-Prüfung.
 */
export function examCatalogForCourse(courseId: string | null = null): CatalogExamPart[] | null {
  const id = courseId ?? MAF_COURSE_ID;
  if (id === MAF_COURSE_ID) return MAF_EXAM_PARTS;
  if (id === INDKFL_COURSE_ID) return INDKFL_EXAM_PARTS;
  return null;
}
