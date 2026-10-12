import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPAIR_API_SCHEMA, schemaKeywords, UNITS_API_SCHEMA, UNSUPPORTED_KEYWORDS } from "./api-schema";
import { validateQuestion } from "./question-schema";

function walk(node: unknown, f: (o: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, f));
  else if (node && typeof node === "object") {
    f(node as Record<string, unknown>);
    Object.values(node).forEach((v) => walk(v, f));
  }
}

describe("SIN-489 API-Schema", () => {
  for (const [name, schema] of [
    ["units", UNITS_API_SCHEMA],
    ["repair", REPAIR_API_SCHEMA],
  ] as const) {
    it(`${name}: keine nicht unterstützten Schlüsselwörter`, () => {
      const kw = schemaKeywords(schema);
      for (const k of UNSUPPORTED_KEYWORDS) assert.ok(!kw.has(k), `${k} im Schema`);
      walk(schema, (o) => {
        if (typeof o.minItems === "number") assert.ok(o.minItems <= 1, "minItems > 1");
        if (o.type === "object" && o.properties) assert.equal(o.additionalProperties, false);
      });
    });
  }

  for (const [name, schema] of [
    ["units", UNITS_API_SCHEMA],
    ["repair", REPAIR_API_SCHEMA],
  ] as const) {
    it(`${name}: bleibt unter den API-Grenzen (24 optionale Felder, 16 Union-Felder)`, () => {
      let optional = 0;
      let unions = 0;
      walk(schema, (o) => {
        if (o.properties && typeof o.properties === "object") {
          const req = new Set((o.required as string[] | undefined) ?? []);
          optional += Object.keys(o.properties).filter((k) => !req.has(k)).length;
        }
        if (Array.isArray(o.anyOf)) unions += 1;
      });
      assert.ok(optional <= 24, `${optional} optionale Felder`);
      assert.ok(unions <= 16, `${unions} Union-Felder`);
      assert.ok(JSON.stringify(schema).length < 20000, "Schema auffällig groß");
    });
  }

  it("Wurzel ist ein Objekt mit units bzw. questions", () => {
    assert.equal(UNITS_API_SCHEMA.type, "object");
    assert.deepEqual(UNITS_API_SCHEMA.required, ["units"]);
    assert.deepEqual(REPAIR_API_SCHEMA.required, ["questions"]);
  });

  it("alle fünf Fragetypen bleiben im Schema; volle Regeln prüft weiter validateQuestion", () => {
    const json = JSON.stringify(UNITS_API_SCHEMA);
    for (const t of ["auswahl", "zuordnen", "lueckentext", "reihenfolge", "rechnen"]) assert.ok(json.includes(`"${t}"`));
    assert.equal(validateQuestion({ type: "auswahl" }).ok, false);
  });
});
