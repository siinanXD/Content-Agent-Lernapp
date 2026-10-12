/**
 * SIN-473: Festes Frageschema der Content-Fabrik. Eine Quelle für fünf Fragetypen:
 * `validateQuestion` prüft vor dem Speichern, `QUESTION_JSON_SCHEMA` ist dieselbe Form als JSON Schema
 * (für den Prompt und Structured Outputs). Die Form entspricht dem Seed (`maf-lernfeld-seed.ts`);
 * dieselben Typnamen nutzt `normalizeQuestion()` (SIN-384) beim Lesen alter Daten.
 */
import type { GeneratedQuestion, GeneratedUnit, QuestionType } from "./maf-lernfeld-seed";

export const QUESTION_TYPES = ["auswahl", "zuordnen", "lueckentext", "reihenfolge", "rechnen"] as const satisfies readonly QuestionType[];
export const QUESTION_LEVELS = ["erinnern", "verstehen", "anwenden"] as const;
/** Trenner der Lösung bei `reihenfolge` (wie im Seed). */
export const STEP_SEPARATOR = " → ";

const text = { type: "string", minLength: 1 } as const;
const textList = (min: number, max?: number) =>
  ({ type: "array", items: text, minItems: min, ...(max ? { maxItems: max } : {}) }) as const;

const baseProps = {
  id: text,
  level: { enum: QUESTION_LEVELS },
  prompt: text,
  explanation: text,
  sourceUrl: text,
  examAreas: { type: "array", items: text },
} as const;
const baseRequired = ["id", "type", "level", "prompt", "correct", "explanation", "sourceUrl", "examAreas"];

function variant(type: QuestionType, props: Record<string, unknown>, extra: string[]) {
  return {
    type: "object",
    properties: { ...baseProps, type: { const: type }, ...props },
    required: [...baseRequired, ...extra],
    additionalProperties: false,
  };
}

/** JSON Schema je Fragetyp (`anyOf`); gleiche Regeln wie `validateQuestion`. */
export const QUESTION_JSON_SCHEMA = {
  anyOf: [
    variant("auswahl", { choices: textList(2, 6), correct: text }, ["choices"]),
    variant(
      "zuordnen",
      {
        pairs: { type: "array", items: textList(2, 2), minItems: 2, maxItems: 8 },
        choices: textList(2, 10),
        correct: textList(2, 8),
      },
      ["pairs"],
    ),
    variant("lueckentext", { blanks: textList(2, 8), correct: text }, ["blanks"]),
    variant("reihenfolge", { steps: textList(3, 8), choices: textList(2, 6), correct: text }, ["steps"]),
    variant(
      "rechnen",
      { choices: textList(2, 6), correct: text, sampleSolution: text, sampleChecklist: textList(1) },
      ["sampleSolution"],
    ),
  ],
} as const;

export type QuestionCheck = { ok: true; question: GeneratedQuestion } | { ok: false; errors: string[] };

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isTextList = (v: unknown, min: number, max = Infinity): v is string[] =>
  Array.isArray(v) && v.length >= min && v.length <= max && v.every(isText);

/** Prüft eine Frage streng gegen das feste Schema. Keine Umformung: ungültig bleibt ungültig. */
export function validateQuestion(raw: unknown): QuestionCheck {
  if (!isRec(raw)) return { ok: false, errors: ["keine Frage (Objekt erwartet)"] };
  const type = raw.type;
  if (!QUESTION_TYPES.includes(type as QuestionType)) {
    return { ok: false, errors: [`unbekannter Typ ${JSON.stringify(type)}; erlaubt: ${QUESTION_TYPES.join(", ")}`] };
  }
  const e: string[] = [];
  for (const k of ["id", "prompt", "explanation", "sourceUrl"] as const) if (!isText(raw[k])) e.push(`${k}: Text erwartet`);
  if (!QUESTION_LEVELS.includes(raw.level as (typeof QUESTION_LEVELS)[number])) e.push("level: erinnern|verstehen|anwenden");
  if (!Array.isArray(raw.examAreas) || !raw.examAreas.every(isText)) e.push("examAreas: Liste von Texten erwartet");

  const { choices, correct } = raw;
  switch (type as QuestionType) {
    case "auswahl":
      if (!isTextList(choices, 2, 6)) e.push("choices: Liste mit 2–6 Texten erwartet");
      if (!isText(correct)) e.push("correct: genau ein Text erwartet");
      else if (isTextList(choices, 2) && !choices.includes(correct)) e.push("correct: muss eine der choices sein");
      break;
    case "zuordnen": {
      const pairs = raw.pairs;
      const pairsOk = Array.isArray(pairs) && pairs.length >= 2 && pairs.length <= 8 && pairs.every((p) => isTextList(p, 2, 2));
      if (!pairsOk) e.push("pairs: Liste von 2–8 Paaren [Begriff, Zuordnung] erwartet (keine Objekte)");
      if (!isTextList(correct, 2, 8)) e.push("correct: Liste der rechten Seiten in Paar-Reihenfolge erwartet");
      else if (pairsOk) {
        const rights = (pairs as string[][]).map((p) => p[1]);
        if (rights.length !== correct.length || rights.some((r, i) => r !== correct[i])) {
          e.push("correct: muss die rechten Seiten der pairs in gleicher Reihenfolge enthalten");
        }
      }
      if (choices !== undefined && !isTextList(choices, 2, 10)) e.push("choices: Liste von Texten erwartet");
      break;
    }
    case "lueckentext":
      if (!isTextList(raw.blanks, 2, 8)) e.push("blanks: Wortliste mit 2–8 Texten erwartet (kein Objekt)");
      if (!isText(correct)) e.push("correct: genau ein Text erwartet");
      else if (isTextList(raw.blanks, 2) && !raw.blanks.includes(correct)) e.push("correct: muss ein Wort aus blanks sein");
      if (isText(raw.prompt) && !raw.prompt.includes("__")) e.push("prompt: Lücke als ____ markieren");
      break;
    case "reihenfolge":
      if (!isTextList(raw.steps, 3, 8)) e.push("steps: Liste mit 3–8 Texten erwartet");
      if (!isText(correct)) e.push("correct: Schritte als ein Text, verbunden mit ' → ' erwartet");
      else if (isTextList(raw.steps, 3) && correct !== raw.steps.join(STEP_SEPARATOR)) {
        e.push("correct: muss steps in Reihenfolge mit ' → ' verbinden");
      }
      if (choices !== undefined && !isTextList(choices, 2, 6)) e.push("choices: Liste von Texten erwartet");
      break;
    case "rechnen":
      if (!isText(correct)) e.push("correct: Ergebnis mit Einheit als Text erwartet");
      if (!isText(raw.sampleSolution)) e.push("sampleSolution: Rechenweg erwartet");
      if (raw.sampleChecklist !== undefined && !isTextList(raw.sampleChecklist, 1)) e.push("sampleChecklist: Liste von Texten erwartet");
      if (choices !== undefined) {
        if (!isTextList(choices, 2, 6)) e.push("choices: Liste von Texten erwartet");
        else if (isText(correct) && !choices.includes(correct)) e.push("correct: muss eine der choices sein");
      }
      break;
  }
  return e.length ? { ok: false, errors: e } : { ok: true, question: raw as unknown as GeneratedQuestion };
}

/** Zähler für den Lauf-Bericht (SIN-473). */
export type SchemaStats = { generated: number; invalid: number; repaired: number; discarded: number };
export const emptySchemaStats = (): SchemaStats => ({ generated: 0, invalid: 0, repaired: 0, discarded: 0 });

export type GatedUnit = {
  /** Einheit nur mit gültigen Fragen. */
  unit: GeneratedUnit;
  invalid: Array<{ question: GeneratedQuestion; errors: string[] }>;
};

/** Trennt gültige und ungültige Fragen einer Einheit. */
export function gateUnit(unit: GeneratedUnit): GatedUnit {
  const valid: GeneratedQuestion[] = [];
  const invalid: GatedUnit["invalid"] = [];
  for (const q of unit.questions ?? []) {
    const r = validateQuestion(q);
    if (r.ok) valid.push(q);
    else invalid.push({ question: q, errors: r.errors });
  }
  return { unit: { ...unit, questions: valid }, invalid };
}

/** Grund-Text für den Reparatur-Prompt (`FailedQuestion.reason`). */
export const schemaReason = (errors: string[]): string => `Schema verletzt: ${errors.join("; ")}`;

export function formatSchemaStats(s: SchemaStats): string {
  return `Fragen erzeugt: ${s.generated}, ungültig: ${s.invalid}, repariert: ${s.repaired}, verworfen: ${s.discarded}`;
}
