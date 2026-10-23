/**
 * SIN-437: OpenAI-Kandidaten für den Goldset-Vergleich `ap22:alle`.
 * Modellnamen und Preise: docs/decisions/SIN-399-openai-generator.md (OpenAI-Preisseite, abgerufen 09.10.2026).
 * Kein Standardmodell: nur der Vergleich nutzt diese Liste.
 */
import { compactApiError } from "@/lib/api-error";
import { REPAIR_API_SCHEMA, UNITS_API_SCHEMA } from "@/lib/generate/api-schema";

export const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export type OpenAICandidate = {
  id: string;
  /** Standard-Preis je 1 Mio. Token (USD). */
  inPerMtok: number;
  outPerMtok: number;
  /** false = Preis nicht auf der Preisseite belegt; es gilt eine vorsichtige Annahme. */
  priceVerified: boolean;
};

export const OPENAI_CANDIDATES: readonly OpenAICandidate[] = [
  { id: "gpt-6-luna", inPerMtok: 0.1, outPerMtok: 0.5, priceVerified: true },
  { id: "gpt-6.1-sol", inPerMtok: 2, outPerMtok: 10, priceVerified: true },
  // Annahme: so teuer wie gpt-6.1-sol, bis die Preisseite den Preis zeigt (siehe SIN-437-Entscheidung).
  { id: "chat-latest", inPerMtok: 2, outPerMtok: 10, priceVerified: false },
];

export const openaiCandidate = (id: string): OpenAICandidate => {
  const hit = OPENAI_CANDIDATES.find((c) => c.id === id);
  if (!hit) throw new Error(`Unbekannter OpenAI-Kandidat ${id}`);
  return hit;
};

export function openaiUsd(id: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
  const c = openaiCandidate(id);
  const usd = (usage.prompt_tokens / 1e6) * c.inPerMtok + (usage.completion_tokens / 1e6) * c.outPerMtok;
  return Math.round(usd * 1e6) / 1e6;
}

/**
 * OpenAI `strict: true` verlangt: jedes Objekt mit additionalProperties false und alle Felder required.
 * Optionale Felder werden daher nullable (`anyOf [..., null]`); `openaiGenerate` entfernt die Nullwerte wieder.
 * `const` wird zu `enum` (SIN-1036).
 */
export function toOpenAIStrict(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toOpenAIStrict);
  if (typeof node !== "object" || node === null) return node;
  const n = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(n)) {
    if (k === "const") out.enum = [v];
    else if (k !== "properties") out[k] = toOpenAIStrict(v);
  }
  if (n.properties && typeof n.properties === "object") {
    const req = new Set((n.required as string[] | undefined) ?? []);
    out.properties = Object.fromEntries(
      Object.entries(n.properties).map(([key, v]) => {
        const sub = toOpenAIStrict(v);
        return [key, req.has(key) ? sub : { anyOf: [sub, { type: "null" }] }];
      }),
    );
    out.required = Object.keys(n.properties);
    out.additionalProperties = false;
  }
  return out;
}

/** Entfernt Nullwerte rekursiv (Gegenstück zu den nullable Feldern aus `toOpenAIStrict`). */
function dropNulls(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(dropNulls);
  if (typeof v !== "object" || v === null) return v;
  return Object.fromEntries(
    Object.entries(v)
      .filter(([, x]) => x !== null)
      .map(([k, x]) => [k, dropNulls(x)]),
  );
}

/** Schemas der Ausgabe für Einheiten und Ersatzfragen: dieselben wie bei Claude, strict für OpenAI. */
export const UNITS_JSON_SCHEMA = toOpenAIStrict(UNITS_API_SCHEMA) as object;
export const QUESTIONS_JSON_SCHEMA = toOpenAIStrict(REPAIR_API_SCHEMA) as object;

export type OpenAIUsage = { prompt_tokens: number; completion_tokens: number };

export type OpenAIRequestOpts = {
  model: string;
  system: string;
  user: string;
  schema: { name: string; schema: object } | null;
  maxCompletionTokens?: number;
};

/** Body für /v1/chat/completions. Mit Schema: Structured Outputs (strict); ohne: JSON-Modus. */
export function buildOpenAIBody(o: OpenAIRequestOpts): Record<string, unknown> {
  return {
    model: o.model,
    max_completion_tokens: o.maxCompletionTokens ?? 32000,
    response_format: o.schema
      ? { type: "json_schema", json_schema: { name: o.schema.name, strict: true, schema: o.schema.schema } }
      : { type: "json_object" },
    messages: [
      { role: "system", content: o.system },
      { role: "user", content: o.user },
    ],
  };
}

export class OpenAIError extends Error {
  constructor(
    readonly status: number,
    model: string,
    body: string,
  ) {
    // Fehlertext von OpenAI mitgeben (Modellname, Parameter, Kontingent); nie den Schlüssel.
    super(`OpenAI ${status} (${model}): ${compactApiError(body)}`);
  }
}

/** Ein normaler Aufruf. Lehnt die API das Schema ab, ist das ein Fehler: keine Wiederholung ohne Schema (SIN-1036). */
export async function openaiGenerate(
  key: string,
  o: OpenAIRequestOpts,
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string; usage: OpenAIUsage }> {
  const res = await fetchImpl(OPENAI_CHAT_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(buildOpenAIBody(o)),
  });
  if (!res.ok) throw new OpenAIError(res.status, o.model, await res.text().catch(() => ""));
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  let text = data.choices?.[0]?.message?.content ?? "";
  if (o.schema) {
    try {
      text = JSON.stringify(dropNulls(JSON.parse(text)));
    } catch {
      throw new Error(`OpenAI (${o.model}): Antwort ist trotz Schema kein gültiges JSON`);
    }
  }
  return {
    text,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
