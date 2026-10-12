import assert from "node:assert/strict";
import { test } from "node:test";
import { gapMatches, normalizeQuestion, normalizeQuestions } from "./normalize-question";

const base = { id: "q1", prompt: "Frage", explanation: "e", sourceUrl: "u", examAreas: ["A"] };

test("zuordnen: Objekt-Paare werden zu [links, rechts]", () => {
  const q = normalizeQuestion({
    ...base,
    type: "zuordnen",
    pairs: [{ left: "Maßstab", right: "Verhältnis" }],
    correct: "x",
  });
  assert.deepEqual(q?.pairs, [["Maßstab", "Verhältnis"]]);
});

test("zuordnen: Listen-Paare bleiben", () => {
  const q = normalizeQuestion({ ...base, type: "zuordnen", pairs: [["a", "b"]], correct: "a" });
  assert.deepEqual(q?.pairs, [["a", "b"]]);
});

test("zuordnen (SIN-477): correct als Liste von Text-Paaren wird nicht verworfen", () => {
  const q = normalizeQuestion({
    ...base,
    type: "zuordnen",
    pairs: [{ left: "Maßstab", right: "Verhältnis" }],
    correct: [["Maßstab", "Verhältnis"]],
  });
  assert.ok(q);
  assert.deepEqual(q.pairs, [["Maßstab", "Verhältnis"]]);
});

test("zuordnen (SIN-477): correct als Liste von Index-Paaren wird nicht verworfen", () => {
  const q = normalizeQuestion({ ...base, type: "zuordnen", pairs: [["a", "b"], ["c", "d"]], correct: [[0, 0], [1, 1]] });
  assert.ok(q);
  assert.deepEqual(q.pairs, [["a", "b"], ["c", "d"]]);
});

test("lueckentext: Lücken mit options und {{id}}-Platzhalter", () => {
  const q = normalizeQuestion({
    ...base,
    type: "lueckentext",
    prompt: "Ein {{b1}} und ein {{b2}}.",
    blanks: [
      { id: "b1", options: ["PSA", "Helm"] },
      { id: "b2", options: ["Hand", "Fuß"] },
    ],
    correct: ["PSA", "Fuß"],
  });
  assert.equal(q?.prompt, "Ein [Lücke 1] und ein [Lücke 2].");
  assert.deepEqual(q?.gaps, [
    { id: "b1", options: ["PSA", "Helm"], accepted: ["PSA"] },
    { id: "b2", options: ["Hand", "Fuß"], accepted: ["Fuß"] },
  ]);
});

test("lueckentext: Lücken mit accepted, Vergleich ohne Groß/Klein und Rand", () => {
  const q = normalizeQuestion({
    ...base,
    type: "lueckentext",
    blanks: [{ id: "1", accepted: ["Newton", "N"] }],
    correct: "Newton",
  });
  const gap = q!.gaps![0]!;
  assert.deepEqual(gap.options, []);
  assert.ok(gapMatches(gap, "  newton "));
  assert.ok(!gapMatches(gap, "Joule"));
  assert.ok(!gapMatches(gap, ""));
});

test("lueckentext: alte Form blanks: string[] geht weiter", () => {
  const q = normalizeQuestion({ ...base, type: "lueckentext", blanks: ["PSA", "Werkzeug"], correct: "PSA" });
  assert.deepEqual(q?.gaps, [{ id: "1", options: ["PSA", "Werkzeug"], accepted: ["PSA"] }]);
});

test("rechnen: correct als { value, unit } wird Text", () => {
  const q = normalizeQuestion({ ...base, type: "rechnen", correct: { value: 30, unit: "min" } });
  assert.equal(q?.correct, "30 min");
  assert.equal(q?.sampleSolution, "30 min");
});

test("Typ-Aliase", () => {
  const typ = (type: string, extra: object = {}) => normalizeQuestion({ ...base, type, correct: "a", ...extra })?.type;
  assert.equal(typ("single", { choices: ["a", "b"] }), "auswahl");
  assert.equal(typ("single_choice", { choices: ["a", "b"] }), "auswahl");
  assert.equal(typ("fill", { blanks: ["a"] }), "lueckentext");
  assert.equal(typ("fill_blank", { blanks: ["a"] }), "lueckentext");
  assert.equal(typ("matching", { pairs: [["a", "b"]] }), "zuordnen");
  assert.equal(typ("match", { pairs: [["a", "b"]] }), "zuordnen");
  assert.equal(typ("ordering", { steps: ["a", "b"] }), "reihenfolge");
  assert.equal(typ("order", { steps: ["a", "b"] }), "reihenfolge");
  assert.equal(typ("numeric"), "rechnen");
});

test("unbekannte Form: null statt Absturz, Rest der Liste bleibt", () => {
  assert.equal(normalizeQuestion({ ...base, type: "zuordnen", pairs: [{ a: 1 }], correct: "" }), null);
  assert.equal(normalizeQuestion({ ...base, type: "quiz", correct: "" }), null);
  assert.equal(normalizeQuestion(null), null);
  const list = normalizeQuestions([
    { ...base, type: "quiz" },
    { ...base, id: "q2", type: "auswahl", choices: ["a"], correct: "a" },
  ]);
  assert.deepEqual(list.map((q) => q.id), ["q2"]);
});
