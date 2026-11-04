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

// SIN-1532: echte Formen aus der Datenbank (MAF), Paare und Schritte stehen dort in `correct`.
test("SIN-1532: choice/choices/true_false werden zu auswahl", () => {
  const choices = ["0,81 kg", "5,4 kg", "8,1 kg", "81 kg"];
  for (const type of ["choice", "choices"]) {
    const q = normalizeQuestion({ ...base, type, choices, correct: "8,1 kg" });
    assert.equal(q?.type, "auswahl", type);
    assert.deepEqual(q?.choices, choices);
  }
  const tf = normalizeQuestion({ ...base, type: "true_false", choices: ["Wahr", "Falsch"], correct: "Falsch" });
  assert.equal(tf?.type, "auswahl");
  assert.equal(tf?.correct, "Falsch");
});

test("SIN-1532: true_false ohne choices bekommt Wahr/Falsch, correct passt sich der Schreibweise an", () => {
  const q = normalizeQuestion({ ...base, type: "true_false", correct: "falsch" });
  assert.deepEqual(q?.choices, ["Wahr", "Falsch"]);
  assert.equal(q?.correct, "Falsch");
});

test("SIN-1532: true_false mit anderer Antwort bleibt ausgeblendet", () => {
  assert.equal(normalizeQuestion({ ...base, type: "true_false", correct: "vielleicht" }), null);
});

test("SIN-1532: blank/blanks/fill_in_blank/fill_in_blanks/cloze mit einer Lücke werden zu lueckentext", () => {
  for (const [type, correct] of [
    ["blank", "Wiedereinschalten"],
    ["blank", ["Wiedereinschalten"]],
    ["blanks", ["Messmittel"]],
    ["fill_in_blank", ["Prüfmittel"]],
    ["fill_in_blanks", ["jedem"]],
    ["cloze", ["geschlossenen"]],
  ] as const) {
    const q = normalizeQuestion({ ...base, type, prompt: "Gesichert gegen ____ .", correct });
    assert.equal(q?.type, "lueckentext", type);
    assert.deepEqual(q?.gaps, [{ id: "1", options: [], accepted: [Array.isArray(correct) ? correct[0] : correct] }]);
  }
});

test("SIN-1532: zwei Lücken im Text und zwei Lösungen ergeben zwei Lücken", () => {
  const q = normalizeQuestion({
    ...base,
    type: "blanks",
    prompt: "Messwerte werden mit dem ____ ermittelt und mit dem ____ dokumentiert.",
    correct: ["Messmittel", "Ergebnis"],
  });
  assert.deepEqual(q?.gaps, [
    { id: "1", options: [], accepted: ["Messmittel"] },
    { id: "2", options: [], accepted: ["Ergebnis"] },
  ]);
  assert.equal(q?.prompt, "Messwerte werden mit dem [Lücke 1] ermittelt und mit dem [Lücke 2] dokumentiert.");
});

test("SIN-1532: mehr Lösungen als Lücken im Text bleibt ausgeblendet, nichts wird geraten", () => {
  assert.equal(
    normalizeQuestion({ ...base, type: "blanks", prompt: "Nur ein ____ im Text.", correct: ["a", "b"] }),
    null,
  );
});

test("SIN-1532: pairs mit correct als Objekt- oder Listen-Paare wird zu zuordnen", () => {
  const objekte = normalizeQuestion({
    ...base,
    type: "pairs",
    correct: [{ left: "Abfälle sind verunreinigt", right: "Sie können nicht recycelt werden" }],
  });
  assert.equal(objekte?.type, "zuordnen");
  assert.deepEqual(objekte?.pairs, [["Abfälle sind verunreinigt", "Sie können nicht recycelt werden"]]);
  const listen = normalizeQuestion({ ...base, type: "pairs", correct: [["a", "b"], ["c", "d"]] });
  assert.deepEqual(listen?.pairs, [["a", "b"], ["c", "d"]]);
});

test("SIN-1532: matching mit correct als Paaren wird spielbar, mit reiner Textliste bleibt es ausgeblendet", () => {
  const ok = normalizeQuestion({ ...base, type: "matching", correct: [{ left: "a", right: "b" }] });
  assert.deepEqual(ok?.pairs, [["a", "b"]]);
  assert.equal(normalizeQuestion({ ...base, type: "matching", correct: ["nur rechts", "nur rechts 2"] }), null);
});

test("SIN-1532: steps/ordering mit correct als Textliste wird zu reihenfolge", () => {
  const steps = ["Abfälle vermeiden", "Nach Stoffen getrennt erfassen", "Fachgerecht entsorgen"];
  for (const type of ["steps", "ordering"]) {
    const q = normalizeQuestion({ ...base, type, correct: steps });
    assert.equal(q?.type, "reihenfolge", type);
    assert.deepEqual(q?.steps, steps);
  }
});

test("SIN-1532: steps mit correct als ein Text bleibt ausgeblendet", () => {
  assert.equal(normalizeQuestion({ ...base, type: "steps", correct: "A → B → C" }), null);
});

test("SIN-1532: numeric_input wird zu rechnen", () => {
  const q = normalizeQuestion({ ...base, type: "numeric_input", correct: "1019" });
  assert.equal(q?.type, "rechnen");
  assert.equal(q?.sampleSolution, "1019");
});

test("SIN-1532: short_answer passt zu keinem der fünf Typen und bleibt ausgeblendet", () => {
  assert.equal(normalizeQuestion({ ...base, type: "short_answer", correct: ["Verletzung"] }), null);
});

test("SIN-1532: die fünf Typen ziehen pairs/steps nicht aus correct (unverändert)", () => {
  assert.equal(normalizeQuestion({ ...base, type: "zuordnen", correct: [{ left: "a", right: "b" }] }), null);
  assert.equal(normalizeQuestion({ ...base, type: "reihenfolge", correct: ["a", "b"] }), null);
});
