import { test } from "node:test";
import assert from "node:assert/strict";
import {
  baseQuestionId,
  examPassed,
  examPercent,
  toWrongAnswer,
  weakestAreas,
} from "./exam-result";
import type { AreaResult } from "./exam";
import type { PathQuestion } from "./playable-path";

test("Bestehensgrenze 50 %: genau 50 % besteht, darunter nicht", () => {
  assert.equal(examPassed(4, 8), true);
  assert.equal(examPassed(3, 8), false);
  assert.equal(examPassed(0, 0), false);
  assert.equal(examPercent(7, 9), 78);
  assert.equal(examPercent(0, 0), 0);
});

test("aufgefüllte Fragen zeigen auf die Ursprungsfrage", () => {
  assert.equal(baseQuestionId("M0-1-q2-pad-3"), "M0-1-q2");
  assert.equal(baseQuestionId("M0-1-q2"), "M0-1-q2");
});

const base: PathQuestion = {
  id: "q1-pad-1",
  type: "auswahl",
  level: "verstehen",
  prompt: "Frage?",
  choices: ["A", "B"],
  correct: "B",
  explanation: "Weil B.",
  sourceUrl: "https://example.org",
  examAreas: [],
};

test("falsche Antwort: richtige Antwort oder Musterlösung, ohne KI", () => {
  assert.deepEqual(toWrongAnswer(base), {
    id: "q1",
    prompt: "Frage?",
    answer: "B",
    explanation: "Weil B.",
  });
  assert.equal(toWrongAnswer({ ...base, correct: ["x", "y"] }).answer, "x, y");
  assert.equal(
    toWrongAnswer({ ...base, choices: undefined, sampleSolution: "Muster" }).answer,
    "Muster",
  );
});

test("schwächste Gebiete: nur rot, schwächstes zuerst", () => {
  const area = (areaId: string, ratio: number, light: AreaResult["light"]) =>
    ({ areaId, title: areaId, ratio, light, correct: 0, total: 0, label: "" }) as AreaResult;
  const out = weakestAreas([
    area("a", 0.9, "green"),
    area("b", 0.55, "red"),
    area("c", 0.48, "red"),
    area("d", 0.3, "red"),
  ]);
  assert.deepEqual(
    out.map((a) => a.areaId),
    ["d", "c"],
  );
});
