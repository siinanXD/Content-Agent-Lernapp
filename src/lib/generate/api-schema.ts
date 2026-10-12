/**
 * SIN-489: Schema für Structured Outputs der Claude-API (`output_config.format`).
 * Abgeleitet aus `QUESTION_JSON_SCHEMA`; Schlüsselwörter, die die API nicht kennt, fallen weg.
 * Die vollen Regeln (Längen, Anzahl, Lösung in choices) prüft weiter `validateQuestion()` danach.
 * Doku: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 */
import { QUESTION_JSON_SCHEMA } from "./question-schema";

/** Von der API nicht unterstützt (`minItems` nur bis 1, siehe `stripUnsupported`). */
export const UNSUPPORTED_KEYWORDS = [
  "maxItems",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "format",
] as const;

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Entfernt nicht unterstützte Schlüsselwörter rekursiv; `minItems` > 1 wird auf 1 gesenkt. */
export function stripUnsupported<T>(node: T): T {
  if (Array.isArray(node)) return node.map((n) => stripUnsupported(n)) as T;
  if (typeof node !== "object" || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if ((UNSUPPORTED_KEYWORDS as readonly string[]).includes(k)) continue;
    if (k === "minItems") {
      if (typeof v === "number" && v > 0) out[k] = 1;
      continue;
    }
    out[k] = stripUnsupported(v);
  }
  return out as T;
}

const str = { type: "string" } as const;

const image = {
  type: "object",
  properties: {
    src: str,
    alt: str,
    longDescription: str,
    kind: { enum: ["flow", "schema", "sign", "sketch", "chart"] },
    source: {
      type: "object",
      properties: { url: str, license: str, attribution: str },
      required: ["url", "license"],
      additionalProperties: false,
    },
    generatedFrom: str,
  },
  required: ["src", "alt", "kind", "source"],
  additionalProperties: false,
} as const;

/**
 * Frage = Frageschema. Kein Bild je Frage: Die API erlaubt höchstens 24 optionale Felder und 16 Union-Felder
 * je Anfrage; ein optionales `image` in allen fünf Typen sprengt das (siehe docs/decisions/SIN-489-structured-outputs.md).
 */
const question = { anyOf: QUESTION_JSON_SCHEMA.anyOf };

const unit = {
  type: "object",
  properties: {
    id: str,
    title: str,
    minutes: { type: "number" },
    moduleId: str,
    blockId: str,
    variant: { enum: ["standard", "ablauf", "rechnen", "sicherheit"] },
    sections: {
      type: "object",
      properties: { einstieg: str, kern: str, beispiel: str, merksatz: str },
      required: ["einstieg", "kern", "beispiel", "merksatz"],
      additionalProperties: false,
    },
    explanation: str,
    explanationSimple: str,
    image,
    safetyFlag: { type: "boolean" },
    sourceUrl: str,
    sourceFetchedAt: str,
    questions: { type: "array", items: question, minItems: 1 },
  },
  required: ["id", "title", "minutes", "sections", "explanation", "sourceUrl", "sourceFetchedAt", "questions"],
  additionalProperties: false,
} as const;

/** Antwort einer Erzeugungs-Anfrage: `{ units: [...] }`. */
export const UNITS_API_SCHEMA = stripUnsupported({
  type: "object",
  properties: { units: { type: "array", items: unit, minItems: 1 } },
  required: ["units"],
  additionalProperties: false,
}) as unknown as Record<string, unknown>;

/** Antwort einer Reparatur-Anfrage: `{ questions: [...] }`. */
export const REPAIR_API_SCHEMA = stripUnsupported({
  type: "object",
  properties: { questions: { type: "array", items: question, minItems: 1 } },
  required: ["questions"],
  additionalProperties: false,
}) as unknown as Record<string, unknown>;

/** Wert für `output_config` in einer Messages-/Batch-Anfrage (kein Beta-Header nötig). */
export function outputConfig(schema: Record<string, unknown>) {
  return { format: { type: "json_schema" as const, schema } };
}

/**
 * SIN-497: Structured Outputs sind nur mit `STRUCTURED_OUTPUTS=1` an. Der erste Lauf mit Schema (SIN-489)
 * scheiterte mit 10 von 10 abgelehnten Anfragen; bis ein echter Lauf es belegt, bleibt es aus (Standard).
 */
export const structuredOutputsEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.STRUCTURED_OUTPUTS?.trim() === "1";

/** Teil der Anfrage-Parameter: `{ output_config }` bei eingeschaltetem Schalter, sonst leer. */
export function structuredParams(schema: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env) {
  return structuredOutputsEnabled(env) ? { output_config: outputConfig(schema) } : {};
}

/** Alle Schlüssel eines Schemas, rekursiv (für Tests). */
export function schemaKeywords(node: Json | unknown, acc = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => schemaKeywords(n, acc));
  else if (typeof node === "object" && node !== null) {
    for (const [k, v] of Object.entries(node)) {
      acc.add(k);
      // `properties` enthält Feldnamen, keine Schlüsselwörter
      if (k === "properties" && typeof v === "object" && v !== null) {
        Object.values(v).forEach((p) => schemaKeywords(p, acc));
      } else schemaKeywords(v, acc);
    }
  }
  return acc;
}
