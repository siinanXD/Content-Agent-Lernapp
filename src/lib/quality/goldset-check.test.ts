import assert from "node:assert/strict";
import { test } from "node:test";
import { checkGoldset, renderGoldsetCheck, type GoldItemForCheck } from "./goldset-check";
import type { QuestionEval } from "./schemas";

const good = { sourceFidelity: 1 as const, uniqueness: 1 as const, niveau: 4, language: 4, safetyFlag: false };
const items: GoldItemForCheck[] = [
  { id: "a", prompt: "Gute Frage A?", expected: good },
  { id: "b", prompt: "Gute Frage B?", expected: good },
  { id: "x1", prompt: "Falsche Zahl?", expected: { ...good, sourceFidelity: 0 }, gegenprobe: "falsch" },
  { id: "x2", prompt: "Nicht eindeutig?", expected: { ...good, uniqueness: 0 }, gegenprobe: "mehrdeutig" },
  { id: "c", prompt: "Gute Frage C?", expected: good },
];
const ev = (id: string, passed: boolean, reasons: string[] = []): QuestionEval => ({ questionId: id, unitId: "u", scores: good, passed, reasons });

test("SIN-449: Abgleich zählt Übereinstimmung, durchgerutschte Gegenproben und abgelehnte gute Fragen", () => {
  const c = checkGoldset(items, [ev("a", true), ev("b", false, ["Niveau 3"]), ev("x1", false), ev("x2", true)]);
  assert.equal(c.total, 5);
  assert.equal(c.judged, 4);
  assert.deepEqual(c.missing, ["c"]);
  assert.equal(c.agree, 2); // a und x1
  assert.equal(c.agreementRate, 0.5);
  assert.deepEqual(c.falseFail, [{ id: "b", reasons: ["Niveau 3"] }]);
  assert.deepEqual(c.falsePass, ["x2"]);
  assert.deepEqual(c.gegenproben, { total: 2, erkannt: 1 });
  const md = renderGoldsetCheck(c, { dataset: "indkfl-goldset", judgeModel: "gpt-5.4-mini", runId: "r1", costUsd: 0.0123, langfuse: "35 Einträge" }, items);
  assert.match(md, /2 von 4/);
  assert.match(md, /Gegenproben erkannt: \*\*1 von 2\*\*/);
  assert.match(md, /`b` Gute Frage B\? → Niveau 3/);
  assert.match(md, /`x2` Nicht eindeutig\?/);
  assert.match(md, /Ohne Urteil: c/);
});
