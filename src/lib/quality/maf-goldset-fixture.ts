/**
 * Sample MAF goldset fixture for offline calibration (AP-06).
 * Structure mirrors Online-Lerncampus 70-question set; content is original
 * practice items citing AO/RLP — not IHK exam copies. Expand to 70 when
 * importing the real goldset into Langfuse EU.
 */
export type GoldQuestion = {
  id: string;
  unitId: string;
  prompt: string;
  correct: string;
  explanation: string;
  sourceUrl: string;
  /** Expected judge scores for offline fixture eval */
  expected: {
    sourceFidelity: 0 | 1;
    uniqueness: 0 | 1;
    niveau: number;
    language: number;
    safetyFlag: boolean;
  };
};

const AO = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";

export const MAF_GOLDSET_FIXTURE: GoldQuestion[] = [
  {
    id: "g01",
    unitId: "lf-sicherheit-u1",
    prompt: "Was prüfst du vor einer neuen Fertigungstätigkeit zuerst?",
    correct: "Gefährdungsbeurteilung und Betriebsanweisung",
    explanation: "AO verlangt Sicherheit und Gesundheitsschutz als Ausbildungsinhalt.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: true },
  },
  {
    id: "g02",
    unitId: "lf-sicherheit-u1",
    prompt: "Wofür steht PSA?",
    correct: "Persönliche Schutzausrüstung",
    explanation: "Standardbegriff im Arbeitsschutz.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: false },
  },
  {
    id: "g03",
    unitId: "lf-sicherheit-u2",
    prompt: "Darf eine Schutzeinrichtung im Normalbetrieb überbrückt werden?",
    correct: "Nein",
    explanation: "Schutzeinrichtungen müssen wirksam bleiben.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 5, language: 5, safetyFlag: true },
  },
  {
    id: "g04",
    unitId: "lf-sicherheit-u2",
    prompt: "Was bedeutet Freischalten vor Umrüsten?",
    correct: "Energie trennen und gegen Wiedereinschalten sichern",
    explanation: "LOTO-Prinzip inklusive Restenergie.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 5, language: 4, safetyFlag: true },
  },
  {
    id: "g05",
    unitId: "lf-sicherheit-u3",
    prompt: "Wohin gehören ölhaltige Betriebsstoffe?",
    correct: "Fachentsorgung / Sammelstelle",
    explanation: "Umweltschutz laut AO.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false },
  },
  {
    id: "g06",
    unitId: "lf-mess-u1",
    prompt: "Was ist der Zweck einer Toleranzangabe?",
    correct: "Zulässige Abweichung vom Nennmaß festlegen",
    explanation: "Prüfen laut Ausbildungsrahmenplan.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false },
  },
  {
    id: "g07",
    unitId: "lf-mess-u1",
    prompt: "Welches Prüfmittel eignet sich für Außendurchmesser im mm-Bereich?",
    correct: "Messschieber oder Bügelmessschraube",
    explanation: "Prüfmittelwahl ist AO-Inhalt.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false },
  },
  {
    id: "g08",
    unitId: "lf-werkstoff-u1",
    prompt: "Warum werden Werk-, Betriebs- und Hilfsstoffe getrennt gelagert?",
    correct: "Sicherheit, Verwechslungsgefahr und Umweltschutz",
    explanation: "Zuordnen und Handhaben laut Berufsbild.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false },
  },
  {
    id: "g09",
    unitId: "lf-pruefung-u1",
    prompt: "Welche Gewichtung hat Produktionstechnik in der schriftlichen Abschlussprüfung?",
    correct: "50 Prozent",
    explanation: "MaschFüAusbV § 9 — Struktur, keine Prüfungsaufgabe.",
    sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/__9.html",
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: false },
  },
  {
    id: "g10",
    unitId: "lf-pruefung-u1",
    prompt: "Nenne die drei schriftlichen Prüfungsbereiche der Abschlussprüfung.",
    correct: "Produktionstechnik, Produktionsplanung, Wirtschafts- und Sozialkunde",
    explanation: "§ 9 MaschFüAusbV.",
    sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/__9.html",
    expected: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false },
  },
  {
    id: "g11",
    unitId: "lf-bad-unique",
    prompt: "Welche Antwort ist richtig?",
    correct: "A und auch B",
    explanation: "Ambiguous — fixture expects uniqueness fail for calibrating the gate.",
    sourceUrl: AO,
    expected: { sourceFidelity: 1, uniqueness: 0, niveau: 3, language: 3, safetyFlag: false },
  },
  {
    id: "g12",
    unitId: "lf-bad-source",
    prompt: "Was ist die geheime IHK-Lösung für Aufgabe 17?",
    correct: "42",
    explanation: "Must fail source fidelity — no official source support; not an IHK copy.",
    sourceUrl: AO,
    expected: { sourceFidelity: 0, uniqueness: 1, niveau: 2, language: 3, safetyFlag: false },
  },
];

export function goldsetFixtureAverages() {
  const passable = MAF_GOLDSET_FIXTURE.filter(
    (q) => q.expected.sourceFidelity === 1 && q.expected.uniqueness === 1,
  );
  const n = passable.length;
  return {
    sampleSize: MAF_GOLDSET_FIXTURE.length,
    passableCount: n,
    niveau:
      Math.round(
        (passable.reduce((s, q) => s + q.expected.niveau, 0) / n) * 10,
      ) / 10,
    language:
      Math.round(
        (passable.reduce((s, q) => s + q.expected.language, 0) / n) * 10,
      ) / 10,
  };
}
