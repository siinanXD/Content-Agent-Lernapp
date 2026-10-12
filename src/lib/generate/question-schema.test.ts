import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSchemaStats,
  gateUnit,
  QUESTION_JSON_SCHEMA,
  QUESTION_TYPES,
  validateQuestion,
} from "./question-schema";
import { enforceQuestionSchema } from "./schema-gate";
import type { GeneratedQuestion, GeneratedUnit } from "./maf-lernfeld-seed";

const base = { level: "verstehen", explanation: "Weil.", sourceUrl: "https://example.org/q", examAreas: ["PT-a"] };

const valid: Record<string, Record<string, unknown>> = {
  auswahl: { id: "a", type: "auswahl", prompt: "Frage?", choices: ["A", "B", "C", "D"], correct: "B", ...base },
  zuordnen: {
    id: "z", type: "zuordnen", prompt: "Ordne zu.",
    pairs: [["Lärm", "Gehörschutz"], ["Späne", "Augenschutz"]], correct: ["Gehörschutz", "Augenschutz"], ...base,
  },
  lueckentext: { id: "l", type: "lueckentext", prompt: "Der ____-Halt.", blanks: ["Not", "Dauer"], correct: "Not", ...base },
  reihenfolge: {
    id: "r", type: "reihenfolge", prompt: "Reihenfolge?", steps: ["Lesen", "Anlegen", "Beginnen"],
    correct: "Lesen → Anlegen → Beginnen", ...base,
  },
  rechnen: { id: "c", type: "rechnen", prompt: "95 dB − 25 dB?", correct: "70 dB", sampleSolution: "95 − 25 = 70", ...base },
};

describe("validateQuestion", () => {
  for (const type of QUESTION_TYPES) {
    it(`${type}: gültiges Beispiel`, () => {
      assert.equal(validateQuestion(valid[type]).ok, true);
    });
  }

  const bad: Array<[string, Record<string, unknown>]> = [
    ["erfundener Typname", { ...valid.auswahl, type: "multiple_choice" }],
    ["auswahl: correct nicht in choices", { ...valid.auswahl, correct: "X" }],
    ["auswahl: correct als Liste", { ...valid.auswahl, correct: ["B"] }],
    ["zuordnen: pairs als Objekt", { ...valid.zuordnen, pairs: { Lärm: "Gehörschutz" } }],
    ["zuordnen: correct als Index-Liste", { ...valid.zuordnen, correct: [0, 1] }],
    ["zuordnen: correct als Text", { ...valid.zuordnen, correct: "Gehörschutz" }],
    ["zuordnen: correct falsche Reihenfolge", { ...valid.zuordnen, correct: ["Augenschutz", "Gehörschutz"] }],
    ["lueckentext: blanks als Objekt", { ...valid.lueckentext, blanks: { "1": "Not" } }],
    ["lueckentext: ohne Lücke im Text", { ...valid.lueckentext, prompt: "Der Halt." }],
    ["reihenfolge: correct als Liste", { ...valid.reihenfolge, correct: ["Lesen", "Anlegen", "Beginnen"] }],
    ["reihenfolge: weniger als 3 Schritte", { ...valid.reihenfolge, steps: ["A", "B"], correct: "A → B" }],
    ["rechnen: correct als Objekt", { ...valid.rechnen, correct: { value: 70, unit: "dB" } }],
    ["rechnen: ohne Rechenweg", { ...valid.rechnen, sampleSolution: "" }],
    ["level fehlt", { ...valid.auswahl, level: undefined }],
  ];
  for (const [name, q] of bad) {
    it(`ungültig: ${name}`, () => {
      const r = validateQuestion(q);
      assert.equal(r.ok, false);
      assert.ok(!r.ok && r.errors.length > 0);
    });
  }

  it("Nicht-Objekt ist ungültig", () => {
    assert.equal(validateQuestion("Frage").ok, false);
    assert.equal(validateQuestion(null).ok, false);
  });

  it("JSON Schema hat eine Variante je Fragetyp", () => {
    const types = QUESTION_JSON_SCHEMA.anyOf.map((v) => (v.properties as { type: { const: string } }).type.const);
    assert.deepEqual(types, [...QUESTION_TYPES]);
  });
});

const unit = (questions: unknown[]): GeneratedUnit =>
  ({ id: "u1", title: "T", minutes: 5, explanation: "E", sourceUrl: "https://example.org", sourceFetchedAt: "2026-10-12", questions }) as unknown as GeneratedUnit;

describe("gateUnit / enforceQuestionSchema", () => {
  it("gateUnit trennt gültige und ungültige", () => {
    const g = gateUnit(unit([valid.auswahl, { ...valid.zuordnen, pairs: {} }]));
    assert.equal(g.unit.questions.length, 1);
    assert.equal(g.invalid.length, 1);
  });

  it("repariert einmal, verwirft den Rest und zählt", async () => {
    const u1 = unit([valid.auswahl, { ...valid.lueckentext, blanks: {} }, { ...valid.rechnen, correct: {} }]);
    let calls = 0;
    const res = await enforceQuestionSchema([u1], async (items) => {
      calls++;
      assert.equal(items[0]!.plan.failed.length, 2);
      assert.match(items[0]!.plan.failed[0]!.reason, /^Schema verletzt/);
      // Ein gültiger Ersatz, ein weiterhin ungültiger.
      return new Map<string, GeneratedQuestion[]>([
        ["u1", [valid.reihenfolge as unknown as GeneratedQuestion, { ...valid.auswahl, correct: "?" } as unknown as GeneratedQuestion]],
      ]);
    });
    assert.equal(calls, 1);
    assert.deepEqual(res.stats, { generated: 3, invalid: 2, repaired: 1, discarded: 1 });
    assert.equal(res.units[0]!.questions.length, 2);
    assert.ok(res.units[0]!.questions.every((q) => validateQuestion(q).ok));
    assert.equal(formatSchemaStats(res.stats), "Fragen erzeugt: 3, ungültig: 2, repariert: 1, verworfen: 1");
  });

  it("ohne ungültige Fragen keine Reparatur", async () => {
    const res = await enforceQuestionSchema([unit([valid.auswahl])], async () => {
      throw new Error("nicht aufrufen");
    });
    assert.equal(res.stats.invalid, 0);
  });
});
