/**
 * SIN-437: OpenAI-Kandidaten für den Goldset-Vergleich `ap22:alle`.
 * Modellnamen und Preise: docs/decisions/SIN-399-openai-generator.md (OpenAI-Preisseite, abgerufen 09.10.2026).
 * Kein Standardmodell: nur der Vergleich nutzt diese Liste.
 */

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
 * Schema der Ausgabe für Einheiten und Ersatzfragen. Bewusst locker (`strict: false`): Fragetypen haben
 * unterschiedliche Felder (choices, pairs, steps, blanks), die der Prompt (`didaktikSchemaHint`) beschreibt.
 */
export const UNITS_JSON_SCHEMA = {
  type: "object",
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          sections: { type: "object" },
          explanation: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                prompt: { type: "string" },
                correct: {},
                explanation: { type: "string" },
                sourceUrl: { type: "string" },
              },
              required: ["id", "type", "prompt", "correct", "explanation", "sourceUrl"],
            },
          },
        },
        required: ["id", "title", "questions"],
      },
    },
  },
  required: ["units"],
} as const;

export const QUESTIONS_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: UNITS_JSON_SCHEMA.properties.units.items.properties.questions,
  },
  required: ["questions"],
} as const;

export type OpenAIUsage = { prompt_tokens: number; completion_tokens: number };

export type OpenAIRequestOpts = {
  model: string;
  system: string;
  user: string;
  schema: { name: string; schema: object } | null;
  maxCompletionTokens?: number;
};

/** Body für /v1/chat/completions. Mit Schema: Structured Outputs; ohne: JSON-Modus. */
export function buildOpenAIBody(o: OpenAIRequestOpts): Record<string, unknown> {
  return {
    model: o.model,
    max_completion_tokens: o.maxCompletionTokens ?? 32000,
    response_format: o.schema
      ? { type: "json_schema", json_schema: { name: o.schema.name, strict: false, schema: o.schema.schema } }
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
    super(`OpenAI ${status} (${model}): ${body.slice(0, 300)}`);
  }
}

/**
 * Ein normaler Aufruf. Lehnt die API das Schema ab (HTTP 400), einmal mit JSON-Modus wiederholen,
 * damit der bezahlte Lauf nicht an einem Schema-Detail scheitert; der Prompt trägt das Schema ohnehin.
 */
export async function openaiGenerate(
  key: string,
  o: OpenAIRequestOpts,
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string; usage: OpenAIUsage }> {
  const call = async (opts: OpenAIRequestOpts) => {
    const res = await fetchImpl(OPENAI_CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify(buildOpenAIBody(opts)),
    });
    if (!res.ok) throw new OpenAIError(res.status, opts.model, await res.text().catch(() => ""));
    return (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
  };
  let data;
  try {
    data = await call(o);
  } catch (e) {
    if (!(e instanceof OpenAIError) || e.status !== 400 || !o.schema) throw e;
    data = await call({ ...o, schema: null });
  }
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
  };
}
