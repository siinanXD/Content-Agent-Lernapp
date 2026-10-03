/**
 * Seed content for one complete MAF Lernfeld (AP-05 / AP-18 acceptance).
 * Sources cite AO/RLP structure only — no IHK exam task copies, no PII.
 * Schema extended for Didaktik (D-31): sections, variant, image, level, examAreas.
 */
import {
  explanationFromSections,
  type QuestionLevel,
  type UnitImage,
  type UnitSections,
  type UnitVariant,
} from "@/lib/content/didaktik";

export type QuestionType =
  | "auswahl"
  | "zuordnen"
  | "lueckentext"
  | "reihenfolge"
  | "rechnen";

export type GeneratedQuestion = {
  id: string;
  type: QuestionType;
  /** AP-18: optional on legacy rows; required for new seed / generate. */
  level?: QuestionLevel;
  prompt: string;
  choices?: string[];
  /** Zuordnen pairs [term, meaning]. */
  pairs?: Array<[string, string]>;
  /** Reihenfolge steps in correct order. */
  steps?: string[];
  /** Lückentext word bank (includes distractors). */
  blanks?: string[];
  correct: string | string[];
  explanation: string;
  sourceUrl: string;
  /** Exam areas from the curriculum module (e.g. PT-a, WISO-1). */
  examAreas?: string[];
  image?: UnitImage;
  /** Open tasks: sample solution only — no AI grading (AGENTS.md). */
  sampleSolution?: string;
  sampleChecklist?: string[];
};

export type GeneratedUnit = {
  id: string;
  title: string;
  minutes: number;
  /** Legacy summary; always kept in sync with sections when present. */
  explanation: string;
  sections?: UnitSections;
  explanationSimple?: string;
  /** AP-18 didactic variant; optional on legacy stored units. */
  variant?: UnitVariant;
  image?: UnitImage;
  questions: GeneratedQuestion[];
  sourceUrl: string;
  sourceFetchedAt: string;
  moduleId?: string;
  blockId?: string;
  niveau?: string;
  safetyFlag?: boolean;
};

export type GeneratedLernfeld = {
  id: string;
  title: string;
  focus: string;
  moduleId?: string;
  blockId?: string;
  units: GeneratedUnit[];
};

const AO_URL = "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html";
const RLP_URL =
  "https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf";
const FETCHED = "2026-10-02T00:00:00.000Z";

const SIGN_IMAGE: UnitImage = {
  src: "/generated/safety-sign-example.svg",
  alt: "Gebotszeichen: Gehörschutz tragen",
  longDescription:
    "Rundes blaues Gebotszeichen mit weißem Kopfhörer-Symbol. Bedeutung: Gehörschutz benutzen.",
  kind: "sign",
  source: {
    url: "https://content-agent.local/generated/safety-sign-example.svg",
    license: "Generated-SVG",
    attribution: "Phase-A SVG template (kein Commons)",
  },
  generatedFrom: "svg-template:safety-sign",
};

const FLOW_IMAGE: UnitImage = {
  src: "/generated/lockout-flow.svg",
  alt: "Ablauf Freischalten sichern prüfen",
  longDescription:
    "Flussdiagramm mit drei Schritten: Freischalten, gegen Wiedereinschalten sichern, Spannungsfreiheit feststellen.",
  kind: "flow",
  source: {
    url: "https://content-agent.local/generated/lockout-flow.svg",
    license: "Generated-SVG",
  },
  generatedFrom: `flowchart TD
  A[Freischalten] --> B[Gegen Wiedereinschalten sichern]
  B --> C[Spannungsfreiheit feststellen]`,
};

function unitFromSections(partial: {
  id: string;
  title: string;
  minutes: number;
  sections: UnitSections;
  explanationSimple?: string;
  variant: UnitVariant;
  image?: UnitImage;
  questions: GeneratedQuestion[];
  sourceUrl: string;
  moduleId: string;
  blockId: string;
  niveau: string;
  safetyFlag?: boolean;
}): GeneratedUnit {
  return {
    ...partial,
    sourceFetchedAt: FETCHED,
    explanation: explanationFromSections(partial.sections),
  };
}

/** One complete Lernfeld: Sicherheit — maps to curriculum block M0-3. */
export function mafSeedLernfeldSicherheit(): GeneratedLernfeld {
  const moduleId = "M0";
  const blockId = "M0-3";
  const niveau = "Grundbildung – wird über beide Jahre verteilt wiederholt";
  const areas = ["WISO-1"];

  return {
    id: "lf-sicherheit",
    title: "Sicherheit und Gesundheitsschutz bei der Arbeit",
    focus: "Metall- und Kunststofftechnik (Pilot)",
    moduleId,
    blockId,
    units: [
      unitFromSections({
        id: "lf-sicherheit-u1",
        title: "Gefährdungen am Arbeitsplatz erkennen",
        minutes: 8,
        moduleId,
        blockId,
        niveau,
        safetyFlag: true,
        variant: "sicherheit",
        sourceUrl: AO_URL,
        image: SIGN_IMAGE,
        sections: {
          einstieg: "Du startest eine neue Tätigkeit an der Maschine und prüfst zuerst die Gefahren.",
          kern:
            "Laut Ausbildungsordnung gehören Sicherheit und Gesundheitsschutz zu den Pflichtinhalten. Typische Gefährdungen sind Bewegungen, scharfe Kanten, Lärm und Gefahrstoffe. Vor der Arbeit liest du die Gefährdungsbeurteilung. Persönliche Schutzausrüstung (PSA) prüfst du vor dem Start.",
          beispiel:
            "Vor dem Schleifen prüfst du Augenschutz und Gehörschutz. Die Betriebsanweisung nennt beides als Pflicht.",
          merksatz: "Erst Gefahr kennen, dann PSA, dann arbeiten.",
        },
        explanationSimple:
          "Vor der Arbeit: Gefahr prüfen. Schutz anziehen. Dann starten.",
        questions: [
          {
            id: "q1",
            type: "auswahl",
            level: "erinnern",
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
            examAreas: areas,
          },
          {
            id: "q2",
            type: "auswahl",
            level: "erinnern",
            prompt: "Welches Zeichen verlangt Gehörschutz?",
            choices: [
              "Rundes blaues Gebot mit Kopfhörer-Symbol",
              "Gelbes Warnzeichen mit Ausrufezeichen",
              "Rotes Verbotszeichen mit durchgestrichenem Fuß",
              "Grünes Rettungszeichen mit Pfeil",
            ],
            correct: "Rundes blaues Gebot mit Kopfhörer-Symbol",
            explanation:
              "Gebotszeichen sind blau und rund. Das Kopfhörer-Symbol bedeutet: Gehörschutz tragen.",
            sourceUrl: AO_URL,
            examAreas: areas,
            image: SIGN_IMAGE,
          },
          {
            id: "q3",
            type: "lueckentext",
            level: "verstehen",
            prompt: "Persönliche Schutzausrüstung wird abgekürzt als ____.",
            blanks: ["PSA", "SPS", "CNC"],
            correct: "PSA",
            explanation: "PSA steht für persönliche Schutzausrüstung.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q4",
            type: "zuordnen",
            level: "verstehen",
            prompt: "Ordne Gefahr und Schutz zu.",
            pairs: [
              ["Lärm", "Gehörschutz"],
              ["Späne beim Schleifen", "Augenschutz"],
              ["Schneidöl-Nebel", "Atemschutz"],
            ],
            choices: ["Gehörschutz", "Augenschutz", "Atemschutz", "Sonnencreme"],
            correct: ["Gehörschutz", "Augenschutz", "Atemschutz"],
            explanation: "Jeder Gefahrstoff und jedes Risiko braucht den passenden Schutz.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q5",
            type: "reihenfolge",
            level: "verstehen",
            prompt: "Bringe die Schritte vor der Tätigkeit in die richtige Reihenfolge.",
            steps: [
              "Betriebsanweisung lesen",
              "PSA anlegen",
              "Tätigkeit beginnen",
            ],
            choices: [
              "Betriebsanweisung lesen → PSA anlegen → Tätigkeit beginnen",
              "Tätigkeit beginnen → PSA anlegen → Betriebsanweisung lesen",
              "PSA anlegen → Tätigkeit beginnen → Betriebsanweisung lesen",
            ],
            correct: "Betriebsanweisung lesen → PSA anlegen → Tätigkeit beginnen",
            explanation: "Zuerst Information, dann Schutz, dann Tätigkeit.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q6",
            type: "rechnen",
            level: "anwenden",
            prompt:
              "Ein Gehörschutz dämpft 25 dB. Der Lärmpegel ist 95 dB. Welcher Pegel bleibt näherungsweise am Ohr? Einheit: dB.",
            choices: ["70 dB", "95 dB", "120 dB", "25 dB"],
            correct: "70 dB",
            explanation:
              "95 − 25 = 70 dB (vereinfachte Rechenübung ohne Messnormen-Ersatz).",
            sourceUrl: AO_URL,
            examAreas: areas,
            sampleSolution: "95 dB − 25 dB = 70 dB.",
            sampleChecklist: [
              "Ausgangspegel notiert",
              "Dämmwert abgezogen",
              "Einheit dB angegeben",
            ],
          },
          {
            id: "q7",
            type: "auswahl",
            level: "anwenden",
            prompt:
              "Beim Schleifen fehlen Augenschutz und Gehörschutz am Platz. Was tust du zuerst?",
            choices: [
              "Trotzdem starten, um Zeit zu sparen",
              "Arbeit stoppen und fehlende PSA holen",
              "Nur eine Sonnenbrille aufsetzen",
              "Den Lärm ignorieren",
            ],
            correct: "Arbeit stoppen und fehlende PSA holen",
            explanation:
              "Ohne vorgeschriebene PSA startest du nicht. Sicherheit geht vor Taktzeit.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
        ],
      }),
      unitFromSections({
        id: "lf-sicherheit-u2",
        title: "Maschinen absichern und Not-Halt",
        minutes: 9,
        moduleId,
        blockId,
        niveau,
        safetyFlag: true,
        variant: "ablauf",
        sourceUrl: AO_URL,
        image: FLOW_IMAGE,
        sections: {
          einstieg: "Du sollst umrüsten, und die Anlage steht noch unter Spannung.",
          kern:
            "1. Energie freischalten. 2. Gegen Wiedereinschalten sichern. 3. Spannungsfreiheit feststellen. 4. Restenergie beachten. Der Not-Halt muss erreichbar und funktionsfähig sein. Schutzeinrichtungen bleiben im Normalbetrieb wirksam.",
          beispiel:
            "Vor dem Werkzeugwechsel schaltest du frei, hängst ein Vorhängeschloss an und misst die Spannung nach.",
          merksatz: "Freischalten, sichern, prüfen — dann erst umrüsten.",
        },
        explanationSimple:
          "Vor dem Umrüsten: Strom aus. Sichern. Prüfen. Dann arbeiten.",
        questions: [
          {
            id: "q1",
            type: "auswahl",
            level: "erinnern",
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
            examAreas: areas,
          },
          {
            id: "q2",
            type: "auswahl",
            level: "erinnern",
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
            examAreas: areas,
          },
          {
            id: "q3",
            type: "lueckentext",
            level: "verstehen",
            prompt: "Der ____-Halt muss jederzeit erreichbar sein.",
            blanks: ["Not", "Dauer", "Soft"],
            correct: "Not",
            explanation: "Not-Halt ist die sofortige Abschaltung im Gefahrenfall.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q4",
            type: "reihenfolge",
            level: "verstehen",
            prompt: "Reihenfolge beim sicheren Umrüsten.",
            steps: ["Freischalten", "Sichern", "Restenergie prüfen"],
            choices: [
              "Freischalten → Sichern → Restenergie prüfen",
              "Sichern → Freischalten → Restenergie prüfen",
              "Restenergie prüfen → Sichern → Freischalten",
            ],
            correct: "Freischalten → Sichern → Restenergie prüfen",
            explanation: "Freischalten, sichern, Restenergie prüfen.",
            sourceUrl: AO_URL,
            examAreas: areas,
            image: FLOW_IMAGE,
          },
          {
            id: "q5",
            type: "zuordnen",
            level: "verstehen",
            prompt: "Ordne Begriff und Bedeutung.",
            pairs: [
              ["Not-Halt", "Sofortige Gefahrenabschaltung"],
              ["Restenergie", "Druck oder Speicher nach dem Abschalten"],
              ["Sichern", "Gegen Wiedereinschalten sperren"],
            ],
            choices: [
              "Sofortige Gefahrenabschaltung",
              "Druck oder Speicher nach dem Abschalten",
              "Gegen Wiedereinschalten sperren",
              "Pause starten",
            ],
            correct: [
              "Sofortige Gefahrenabschaltung",
              "Druck oder Speicher nach dem Abschalten",
              "Gegen Wiedereinschalten sperren",
            ],
            explanation: "Die Begriffe beschreiben den sicheren Umrüstablauf.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q6",
            type: "auswahl",
            level: "anwenden",
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
            examAreas: areas,
          },
          {
            id: "q7",
            type: "rechnen",
            level: "anwenden",
            prompt:
              "Drei Verriegelungen müssen geprüft werden. Jede Prüfung dauert 2 Minuten. Wie lange insgesamt?",
            choices: ["6 Minuten", "3 Minuten", "9 Minuten", "2 Minuten"],
            correct: "6 Minuten",
            explanation:
              "3 × 2 = 6 Minuten — einfache Zeitrechnung für Prüfschritte an der Maschine.",
            sourceUrl: AO_URL,
            examAreas: areas,
            sampleSolution: "3 Verriegelungen × 2 Minuten = 6 Minuten.",
            sampleChecklist: ["Anzahl richtig", "Multiplikation", "Einheit Minuten"],
          },
        ],
      }),
      unitFromSections({
        id: "lf-sicherheit-u3",
        title: "Umweltschutz und Entsorgung in der Fertigung",
        minutes: 7,
        moduleId,
        blockId,
        niveau,
        safetyFlag: true,
        variant: "standard",
        sourceUrl: RLP_URL,
        sections: {
          einstieg: "Nach der Schicht stehen Späne, Öl und Verpackung zur Entsorgung bereit.",
          kern:
            "Die Ausbildungsordnung verlangt Umweltschutzkenntnisse. Späne, Öle, Kühlschmierstoffe und Verpackungen erfasst du getrennt. Lecks und Verschmutzungen meldest du sofort. Für Altöl und ölhaltige Abfälle nutzt du die Fachentsorgung.",
          beispiel:
            "Altöl kommt in den gekennzeichneten Sammelbehälter, nicht in den Abfluss und nicht in den Hausmüll.",
          merksatz: "Getrennt sammeln, melden, fachgerecht entsorgen.",
        },
        questions: [
          {
            id: "q1",
            type: "auswahl",
            level: "erinnern",
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
            examAreas: areas,
          },
          {
            id: "q2",
            type: "lueckentext",
            level: "erinnern",
            prompt: "Späne und ____stoffe werden getrennt gesammelt.",
            blanks: ["Hilfs", "Luxus", "Büro"],
            correct: "Hilfs",
            explanation: "Hilfsstoffe und Späne nicht vermischen.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q3",
            type: "auswahl",
            level: "verstehen",
            prompt: "Was tun bei einem Kühlschmierstoff-Leck?",
            choices: [
              "Ignorieren",
              "Absperren, melden, Fachvorschrift befolgen",
              "Mit Wasser verdünnen und ableiten",
              "Nur wischen ohne Meldung",
            ],
            correct: "Absperren, melden, Fachvorschrift befolgen",
            explanation:
              "Lecks sind Umwelt- und Rutschgefahr; Meldung und Fachmaßnahmen sind Pflicht.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q4",
            type: "zuordnen",
            level: "verstehen",
            prompt: "Ordne Abfall und Entsorgung.",
            pairs: [
              ["Altöl", "Sondermüll/Sammelstelle"],
              ["Sauberes Papier", "Papiertonne"],
              ["Brot vom Pausenraum", "Biomüll"],
            ],
            choices: ["Sondermüll/Sammelstelle", "Papiertonne", "Biomüll", "Abfluss"],
            correct: ["Sondermüll/Sammelstelle", "Papiertonne", "Biomüll"],
            explanation: "Altöl ist gesondert zu entsorgen.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q5",
            type: "reihenfolge",
            level: "anwenden",
            prompt: "Ablauf bei einem Leck.",
            steps: ["Bereich sichern", "Melden", "Fachentsorgung"],
            choices: [
              "Bereich sichern → Melden → Fachentsorgung",
              "Melden → Fachentsorgung → Bereich sichern",
              "Fachentsorgung → Bereich sichern → Melden",
            ],
            correct: "Bereich sichern → Melden → Fachentsorgung",
            explanation: "Zuerst sichern, dann melden, dann fachgerecht entsorgen.",
            sourceUrl: AO_URL,
            examAreas: areas,
          },
          {
            id: "q6",
            type: "rechnen",
            level: "anwenden",
            prompt:
              "Zwei Kanister à 5 Liter Altöl und ein Kanister mit 2 Litern. Wie viel Liter Altöl insgesamt?",
            choices: ["12 Liter", "10 Liter", "7 Liter", "5 Liter"],
            correct: "12 Liter",
            explanation: "2 × 5 + 2 = 12 Liter.",
            sourceUrl: AO_URL,
            examAreas: areas,
            sampleSolution: "5 + 5 + 2 = 12 Liter.",
            sampleChecklist: ["Beide 5-Liter-Kanister", "+ 2 Liter", "Einheit Liter"],
          },
        ],
      }),
    ],
  };
}

export function lernfeldIsComplete(lf: GeneratedLernfeld): boolean {
  if (!lf.units.length) return false;
  return lf.units.every((u) => {
    const explanationOk =
      (u.sections
        ? explanationFromSections(u.sections).trim().length > 40
        : u.explanation.trim().length > 40) &&
      (!u.sections || u.explanation.trim().length > 0);
    return (
      explanationOk &&
      u.questions.length >= 5 &&
      u.questions.length <= 8 &&
      u.questions.every(
        (q) =>
          q.explanation.trim().length > 10 &&
          q.sourceUrl.startsWith("http") &&
          Boolean(q.level) &&
          Array.isArray(q.examAreas) &&
          q.examAreas.length > 0,
      ) &&
      u.sourceUrl.startsWith("http") &&
      Boolean(u.variant) &&
      Boolean(u.sections)
    );
  });
}
