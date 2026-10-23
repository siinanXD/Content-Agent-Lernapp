import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSourcesJson, runResearchAgent, SOURCES_API_SCHEMA } from "./research-agent";

describe("Research-Agent mit Schema (SIN-1036)", () => {
  const fixture = JSON.stringify({
    sources: [
      { title: "Verordnung", url: "https://www.gesetze-im-internet.de/mascham_ausbv/", kind: "ausbildungsordnung" },
      { title: "Ohne URL", url: "kein-link", kind: "other" },
    ],
  });

  it("liest die Schema-Antwort ohne Regex und verwirft Einträge ohne http-URL", () => {
    const s = parseSourcesJson(fixture);
    assert.equal(s.length, 1);
    assert.equal(s[0]!.kind, "ausbildungsordnung");
    assert.deepEqual(parseSourcesJson(`Hier: ${fixture}`), []);
    assert.deepEqual(parseSourcesJson("[]"), []);
  });

  it("letzte Live-Anfrage ohne Tools trägt output_config.format mit dem Quellen-Schema", async () => {
    const oldFetch = globalThis.fetch;
    const oldKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test";
    const bodies: Array<{ tools?: unknown; output_config?: { format: { type: string; schema: unknown } } }> = [];
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      const text = bodies.length === 1 ? "Gefunden." : fixture;
      return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text }] }));
    }) as typeof fetch;
    try {
      const r = await runResearchAgent("Beruf X");
      assert.equal(r.mode, "live");
      assert.equal(r.sources.length, 1);
    } finally {
      globalThis.fetch = oldFetch;
      if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = oldKey;
    }
    const last = bodies.at(-1)!;
    assert.equal(last.tools, undefined);
    assert.equal(last.output_config?.format.type, "json_schema");
    assert.deepEqual(last.output_config?.format.schema, SOURCES_API_SCHEMA);
  });
});
