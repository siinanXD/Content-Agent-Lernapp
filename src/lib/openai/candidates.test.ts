import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpenAIBody,
  openaiGenerate,
  openaiUsd,
  OpenAIError,
  OPENAI_CANDIDATES,
  UNITS_JSON_SCHEMA,
} from "./candidates";

const ok = (content: string, usage = { prompt_tokens: 100, completion_tokens: 50 }) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }], usage }), { status: 200 });

describe("OpenAI-Anfrage (SIN-437)", () => {
  it("feste Kandidaten laut SIN-399", () => {
    assert.deepEqual(OPENAI_CANDIDATES.map((c) => c.id), ["gpt-6-luna", "gpt-6.1-sol", "chat-latest"]);
  });

  it("Body mit Schema: json_schema, nicht strikt, System und Nutzer getrennt", () => {
    const body = buildOpenAIBody({ model: "gpt-6-luna", system: "S", user: "U", schema: { name: "units", schema: UNITS_JSON_SCHEMA } }) as {
      response_format: { type: string; json_schema: { name: string; strict: boolean } };
      messages: Array<{ role: string; content: string }>;
      max_completion_tokens: number;
    };
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, false);
    assert.deepEqual(body.messages.map((m) => m.role), ["system", "user"]);
    assert.ok(body.max_completion_tokens > 0);
    assert.equal((buildOpenAIBody({ model: "m", system: "", user: "", schema: null }) as { response_format: { type: string } }).response_format.type, "json_object");
  });

  it("Kosten aus Token und Preis", () => {
    assert.equal(openaiUsd("gpt-6.1-sol", { prompt_tokens: 1_000_000, completion_tokens: 100_000 }), 3);
    assert.throws(() => openaiUsd("unbekannt", { prompt_tokens: 1, completion_tokens: 1 }), /Unbekannter/);
  });

  it("liefert Text und Token", async () => {
    const r = await openaiGenerate("k", { model: "gpt-6-luna", system: "", user: "", schema: null }, async () => ok('{"units":[]}'));
    assert.equal(r.text, '{"units":[]}');
    assert.deepEqual(r.usage, { prompt_tokens: 100, completion_tokens: 50 });
  });

  it("Fehlerfall: Status und Modell im Text, nie der Schlüssel", async () => {
    await assert.rejects(
      () => openaiGenerate("geheim-key", { model: "gpt-6.1-sol", system: "", user: "", schema: null }, async () => new Response("kein Kontingent", { status: 429 })),
      (e: unknown) => e instanceof OpenAIError && /429 \(gpt-6\.1-sol\): kein Kontingent/.test(e.message) && !e.message.includes("geheim-key"),
    );
  });

  it("400 mit Schema: einmal mit JSON-Modus wiederholen", async () => {
    const formats: string[] = [];
    const r = await openaiGenerate("k", { model: "chat-latest", system: "", user: "", schema: { name: "units", schema: UNITS_JSON_SCHEMA } }, async (_u, init) => {
      formats.push(JSON.parse(String(init?.body)).response_format.type);
      return formats.length === 1 ? new Response("schema abgelehnt", { status: 400 }) : ok("{}");
    });
    assert.deepEqual(formats, ["json_schema", "json_object"]);
    assert.equal(r.text, "{}");
  });

  it("400 ohne Schema: Fehler, keine Wiederholung", async () => {
    let calls = 0;
    await assert.rejects(() =>
      openaiGenerate("k", { model: "m", system: "", user: "", schema: null }, async () => {
        calls += 1;
        return new Response("x", { status: 400 });
      }),
    );
    assert.equal(calls, 1);
  });
});
