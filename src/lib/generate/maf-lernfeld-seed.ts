/**
 * Seed content for one complete MAF Lernfeld (AP-05 acceptance).
 * Sources cite AO/RLP structure only — no IHK exam task copies, no PII.
 */
export type QuestionType =
  | "auswahl"
  | "zuordnen"
  | "lueckentext"
  | "reihenfolge"
  | "rechnen";

export type GeneratedQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  choices?: string[];
  correct: string | string[];
  explanation: string;
  sourceUrl: string;
};

export type GeneratedUnit = {
  id: string;
  title: string;
  minutes: number;
  explanation: string;
  questions: GeneratedQuestion[];
  sourceUrl: string;
  sourceFetchedAt: string;
  /** Curriculum map refs (AP-14). */
  moduleId: string;
  blockId: string;
  niveau?: string;
  safetyFlag?: boolean;
};

export type GeneratedLernfeld = {
  id: string;
  title: string;
  focus: string;
  moduleId: string;
  blockId: string;
  units: GeneratedUnit[];
};

const AO_URL = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
const RLP_URL =
  "https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf";
const FETCHED = "2026-10-02T00:00:00.000Z";

/** One complete Lernfeld: Sicherheit — maps to curriculum block M0-3 (AP-14). */
export function mafSeedLernfeldSicherheit(): GeneratedLernfeld {
  const moduleId = "M0";
  const blockId = "M0-3";
  const niveau = "Grundbildung – wird über beide Jahre verteilt wiederholt";
  return {
    id: "lf-sicherheit",
    title: "Sicherheit und Gesundheitsschutz bei der Arbeit",
    focus: "Metall- und Kunststofftechnik (Pilot)",
    moduleId,
    blockId,
    units: [
      {
        id: "lf-sicherheit-u1",
        title: "Gefährdungen am Arbeitsplatz erkennen",
        minutes: 8,
        sourceUrl: AO_URL,
        sourceFetchedAt: FETCHED,
        moduleId,
        blockId,
        niveau,
        safetyFlag: true,
        explanation:
          "Laut Ausbildungsordnung gehören Sicherheit und Gesundheitsschutz zu den verpflichtenden Ausbildungsinhalten. Typische Gefährdungen in der Fertigung sind mechanische Bewegungen, scharfe Kanten, Lärm, Gefahrstoffe und Stolperstellen. Vor jeder Tätigkeit die Gefährdungsbeurteilung des Betriebs beachten und persönliche Schutzausrüstung (PSA) prüfen.",
        questions: [
          {
            id: "q1",
            type: "auswahl",
            prompt: "Was ist der erste Schritt vor Aufnahme einer neuen Fertigungstätigkeit?",
            choices: [
              "Sofort die Maschine einschalten",
              "Gefährdungsbeurteilung und Betriebsanweisung prüfen",
              "Nur Handschuhe wechseln",
              "Pause einlegen",
            ],
            correct: "Gefährdungsbeurteilung und Betriebsanweisung prüfen",
            explanation:
              "Die AO verlangt Maßnahmen zu Sicherheit und Gesundheitsschutz; Betriebsanweisungen und Gefährdungsbeurteilung sind die verbindliche Grundlage.",
            sourceUrl: AO_URL,
          },
          {
            id: "q2",
            type: "auswahl",
            prompt: "Welche PSA ist bei Schleifarbeiten typischerweise erforderlich?",
            choices: ["Nur Gehörschutz", "Augenschutz und Gehörschutz", "Nur Sicherheitsschuhe", "Keine PSA"],
            correct: "Augenschutz und Gehörschutz",
            explanation:
              "Schleifen erzeugt Späne und Lärm; Augenschutz und Gehörschutz sind Standardmaßnahmen laut Arbeitsschutzpraxis in der Fertigung.",
            sourceUrl: AO_URL,
          },
          {
            id: "q3",
            type: "lueckentext",
            prompt: "Persönliche Schutzausrüstung wird abgekürzt als ____.",
            correct: "PSA",
            explanation: "PSA steht für persönliche Schutzausrüstung.",
            sourceUrl: AO_URL,
          },
          {
            id: "q4",
            type: "zuordnen",
            prompt: "Ordne zu: Lärm → ?",
            choices: ["Gehörschutz", "Atemschutz", "Schnittschutzhandschuhe"],
            correct: "Gehörschutz",
            explanation: "Lärmgefährdung wird primär durch Gehörschutz gemindert.",
            sourceUrl: AO_URL,
          },
          {
            id: "q5",
            type: "reihenfolge",
            prompt: "Bringe in die richtige Reihenfolge: A) Tätigkeit beginnen B) PSA anlegen C) Betriebsanweisung lesen",
            choices: ["C-B-A", "A-B-C", "B-A-C"],
            correct: "C-B-A",
            explanation: "Zuerst Information, dann Schutz, dann Tätigkeit.",
            sourceUrl: AO_URL,
          },
          {
            id: "q6",
            type: "rechnen",
            prompt: "Ein Gehörschutz dämpft 25 dB. Der Lärmpegel ist 95 dB. Welcher Pegel bleibt näherungsweise am Ohr?",
            choices: ["70 dB", "95 dB", "120 dB", "25 dB"],
            correct: "70 dB",
            explanation: "95 − 25 = 70 dB (vereinfachte Rechenübung ohne Messnormen-Ersatz).",
            sourceUrl: AO_URL,
          },
        ],
      },
      {
        id: "lf-sicherheit-u2",
        title: "Maschinen absichern und Not-Halt",
        minutes: 9,
        sourceUrl: AO_URL,
        sourceFetchedAt: FETCHED,
        moduleId,
        blockId,
        niveau,
        safetyFlag: true,
        explanation:
          "Vor dem Einrichten und Bedienen müssen Schutzeinrichtungen wirksam sein. Der Not-Halt muss erreichbar und funktionsfähig sein. Bei Umrüsten gilt: Energie freischalten, gegen Wiedereinschalten sichern, Restenergie beachten.",
        questions: [
          {
            id: "q1",
            type: "auswahl",
            prompt: "Wann darf eine Schutzeinrichtung überbrückt werden?",
            choices: [
              "Nie im Normalbetrieb",
              "Immer bei Zeitdruck",
              "Nur wenn der Meister telefoniert",
              "Bei jeder Wartung ohne Dokumentation",
            ],
            correct: "Nie im Normalbetrieb",
            explanation:
              "Schutzeinrichtungen sind Teil der sicheren Betriebsweise; Überbrücken im Normalbetrieb ist unzulässig.",
            sourceUrl: AO_URL,
          },
          {
            id: "q2",
            type: "auswahl",
            prompt: "Was gehört zum Freischalten vor Umrüstarbeiten?",
            choices: [
              "Nur den Monitor ausschalten",
              "Energie trennen und gegen Wiedereinschalten sichern",
              "Nur die Tür schließen",
              "Nur Handschuhe tragen",
            ],
            correct: "Energie trennen und gegen Wiedereinschalten sichern",
            explanation: "LOTO-Prinzip: trennen und sichern, Restenergie beachten.",
            sourceUrl: AO_URL,
          },
          {
            id: "q3",
            type: "lueckentext",
            prompt: "Der ____-Halt muss jederzeit erreichbar sein.",
            correct: "Not",
            explanation: "Not-Halt ist die sofortige Abschaltung im Gefahrenfall.",
            sourceUrl: AO_URL,
          },
          {
            id: "q4",
            type: "reihenfolge",
            prompt: "Reihenfolge beim sicheren Umrüsten: A) Sichern B) Freischalten C) Restenergie prüfen",
            choices: ["B-A-C", "A-B-C", "C-A-B"],
            correct: "B-A-C",
            explanation: "Freischalten, sichern, Restenergie prüfen.",
            sourceUrl: AO_URL,
          },
          {
            id: "q5",
            type: "zuordnen",
            prompt: "Ordne zu: Not-Halt → ?",
            choices: ["Sofortige Gefahrenabschaltung", "Pause starten", "Werkzeugwechsel"],
            correct: "Sofortige Gefahrenabschaltung",
            explanation: "Not-Halt dient der sofortigen Abschaltung bei Gefahr.",
            sourceUrl: AO_URL,
          },
          {
            id: "q6",
            type: "auswahl",
            prompt: "Warum ist Restenergie relevant?",
            choices: [
              "Weil Druck/Feder/elektrische Speicher nachwirken können",
              "Weil Pausen länger dauern",
              "Weil Zeichnungen veraltet sind",
              "Weil PSA bunt sein muss",
            ],
            correct: "Weil Druck/Feder/elektrische Speicher nachwirken können",
            explanation: "Nach dem Abschalten können Speicherenergien noch wirken.",
            sourceUrl: AO_URL,
          },
          {
            id: "q7",
            type: "rechnen",
            prompt: "Drei Verriegelungen müssen geprüft werden. Jede Prüfung dauert 2 Minuten. Wie lange insgesamt?",
            choices: ["6 Minuten", "3 Minuten", "9 Minuten", "2 Minuten"],
            correct: "6 Minuten",
            explanation: "3 × 2 = 6 Minuten — einfache Zeitrechnung für Prüfschritte an der Maschine.",
            sourceUrl: AO_URL,
          },
        ],
      },
      {
        id: "lf-sicherheit-u3",
        title: "Umweltschutz und Entsorgung in der Fertigung",
        minutes: 7,
        sourceUrl: RLP_URL,
        sourceFetchedAt: FETCHED,
        moduleId,
        blockId,
        niveau,
        safetyFlag: true,
        explanation:
          "Die Ausbildungsordnung verlangt Umweltschutzkenntnisse. Späne, Öle, Kühlschmierstoffe und Verpackungen sind getrennt zu erfassen. Lecks und Verschmutzungen sofort melden und Fachentsorgung nutzen.",
        questions: [
          {
            id: "q1",
            type: "auswahl",
            prompt: "Wie werden ölhaltige Betriebsstoffe entsorgt?",
            choices: [
              "Über den Hausmüll",
              "Über die vorgesehene Fachentsorgung / Sammelstelle",
              "In den Abfluss",
              "Ins Freie gießen",
            ],
            correct: "Über die vorgesehene Fachentsorgung / Sammelstelle",
            explanation:
              "Gefahrstoffe und ölhaltige Abfälle gehören in die betrieblich vorgesehene Entsorgung.",
            sourceUrl: AO_URL,
          },
          {
            id: "q2",
            type: "lueckentext",
            prompt: "Späne und ____stoffe werden getrennt gesammelt.",
            correct: "Hilfs",
            explanation: "Hilfsstoffe und Späne nicht vermischen.",
            sourceUrl: AO_URL,
          },
          {
            id: "q3",
            type: "auswahl",
            prompt: "Was tun bei einem Kühlschmierstoff-Leck?",
            choices: [
              "Ignorieren",
              "Absperren, melden, Fachvorschrift befolgen",
              "Mit Wasser verdünnen und ableiten",
              "Nur wischen ohne Meldung",
            ],
            correct: "Absperren, melden, Fachvorschrift befolgen",
            explanation: "Lecks sind Umwelt- und Rutschgefahr; Meldung und Fachmaßnahmen sind Pflicht.",
            sourceUrl: AO_URL,
          },
          {
            id: "q4",
            type: "zuordnen",
            prompt: "Ordne zu: Altöl → ?",
            choices: ["Sondermüll/Sammelstelle", "Papiertonne", "Biomüll"],
            correct: "Sondermüll/Sammelstelle",
            explanation: "Altöl ist gesondert zu entsorgen.",
            sourceUrl: AO_URL,
          },
          {
            id: "q5",
            type: "reihenfolge",
            prompt: "Bei Leck: A) Melden B) Bereich sichern C) Fachentsorgung",
            choices: ["B-A-C", "A-C-B", "C-B-A"],
            correct: "B-A-C",
            explanation: "Zuerst sichern, dann melden, dann fachgerecht entsorgen.",
            sourceUrl: AO_URL,
          },
        ],
      },
    ],
  };
}

export function lernfeldIsComplete(lf: GeneratedLernfeld): boolean {
  if (!lf.units.length || !lf.moduleId || !lf.blockId) return false;
  return lf.units.every(
    (u) =>
      u.explanation.trim().length > 40 &&
      Boolean(u.moduleId) &&
      Boolean(u.blockId) &&
      u.questions.length >= 5 &&
      u.questions.length <= 8 &&
      u.questions.every((q) => q.explanation.trim().length > 10 && q.sourceUrl.startsWith("http")) &&
      u.sourceUrl.startsWith("http"),
  );
}
