import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mafSeedPlanVariants } from "./maf-plan-seed";
import { parseVariantsJson, PLAN_API_SCHEMA, runPlanAgent } from "./plan-agent";

describe("Plan-Agent mit Schema (SIN-1036)", () => {
  const fixture = JSON.stringify({ variants: mafSeedPlanVariants() });

  it("liest die Schema-Antwort ohne Regex; Freitext oder Array ohne Hülle ergibt keine Varianten", () => {
    assert.equal(parseVariantsJson(fixture).length, 2);
    assert.deepEqual(parseVariantsJson(`Hier: ${fixture}`), []);
    assert.deepEqual(parseVariantsJson(JSON.stringify(mafSeedPlanVariants())), []);
  });

  it("Live-Anfrage enthält output_config.format mit dem Plan-Schema", async () => {
    const oldFetch = globalThis.fetch;
    const oldKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test";
    let sent: { output_config?: { format: { type: string; schema: unknown } } } = {};
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ content: [{ type: "text", text: fixture }] }));
    }) as typeof fetch;
    try {
      await runPlanAgent("Maschinen- und Anlagenführer");
    } finally {
      globalThis.fetch = oldFetch;
      if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = oldKey;
    }
    assert.equal(sent.output_config?.format.type, "json_schema");
    assert.deepEqual(sent.output_config?.format.schema, PLAN_API_SCHEMA);
  });
});
