import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  annotateRepairQuestions,
  applyRepair,
  buildRepairPrompt,
  MIN_PASSED_QUESTIONS,
  parseRepairQuestions,
  planQuestionRepair,
} from "./repair-questions";
import type { GeneratedQuestion, GeneratedUnit } from "./maf-lernfeld-seed";
import type { QuestionEval } from "@/lib/quality/schemas";
import { compareRepairCost, emptyLedger, OLD_REGEN_EUR_PER_UNIT } from "@/lib/quality/cost-guard";

const q = (id: string): GeneratedQuestion => ({
  id,
  type: "auswahl",
  prompt: `Frage ${id}?`,
  choices: ["a", "b"],
  correct: "a",
  explanation: "Weil.",
  sourceUrl: "https://example.com",
});

const unit = (n: number): GeneratedUnit => ({
  id: "M0-1-u1",
  title: "Titel",
  minutes: 7,
  explanation: "Kerntext",
  sourceUrl: "https://example.com",
  sourceFetchedAt: "2026-10-03",
  questions: Array.from({ length: n }, (_, i) => q(`q${i + 1}`)),
});

const ev = (u: GeneratedUnit, id: string, passed: boolean, reason?: string) => ({
  questionId: `${u.id}-${id}`,
  unitId: u.id,
  passed,
  reason,
});

const qeval = (u: GeneratedUnit, id: string, passed: boolean): QuestionEval => ({
  questionId: `${u.id}-${id}`,
  unitId: u.id,
  passed,
  reasons: passed ? [] : ["zwei richtige Antworten"],
  scores: { sourceFidelity: 1, uniqueness: passed ? 1 : 0, niveau: 4, language: 4, safetyFlag: false },
});

describe("AP-21 planQuestionRepair", () => {
  it("behält bestandene, ersetzt nur durchgefallene (mit Grund)", () => {
    const u = unit(7);
    const latest = [
      ...["q1", "q2", "q3", "q4"].map((id) => ev(u, id, true)),
      ev(u, "q5", false, "Quelle trägt Antwort nicht"),
      ev(u, "q6", false),
      // q7 ohne Bewertung
    ];
    const plan = planQuestionRepair(u, latest);
    assert.equal(plan.kept.length, 4);
    assert.deepEqual(plan.failed.map((f) => f.question.id), ["q5", "q6", "q7"]);
    assert.equal(plan.failed[0]!.reason, "Quelle trägt Antwort nicht");
    assert.equal(plan.failed[2]!.reason, "nicht bewertet");
    assert.equal(plan.replacements, 3);
    assert.equal(plan.alreadyPublishable, false);
  });

  it("ab 5 bestandenen Fragen ist kein Ersatz nötig", () => {
    const u = unit(7);
    const latest = u.questions.map((x, i) => ev(u, x.id, i < MIN_PASSED_QUESTIONS));
    const plan = planQuestionRepair(u, latest);
    assert.equal(plan.alreadyPublishable, true);
    assert.equal(plan.replacements, 0);
  });

  it("ersetzt nie über 8 Fragen hinaus", () => {
    const u = unit(8);
    const plan = planQuestionRepair(u, [ev(u, "q1", true), ...u.questions.slice(1).map((x) => ev(u, x.id, false))]);
    assert.equal(plan.kept.length + plan.replacements, 8);
  });
});

describe("AP-21 Prompt und Parser", () => {
  it("Prompt enthält nur durchgefallene Fragen mit Grund, bestandene nur als Dubletten-Schutz", () => {
    const u = unit(6);
    const plan = planQuestionRepair(u, [
      ...["q1", "q2", "q3", "q4"].map((id) => ev(u, id, true)),
      ev(u, "q5", false, "Antwort nicht eindeutig"),
      ev(u, "q6", false, "Niveau zu niedrig"),
    ]);
    const prompt = buildRepairPrompt(u, plan);
    assert.match(prompt, /Antwort nicht eindeutig/);
    assert.match(prompt, /Niveau zu niedrig/);
    assert.match(prompt, /genau 2 neue Ersatzfragen/);
    assert.match(prompt, /Kerntext/);
    assert.doesNotMatch(prompt, /Richtige Antwort[^\n]*\n[^\n]*\n[^\n]*Frage q1\?/);
  });

  it("parst nur das questions-Array und vergibt kollisionsfreie Ids", () => {
    const u = unit(5);
    const parsed = parseRepairQuestions(`Text {"questions":[{"id":"q1","prompt":"x","correct":"a"}]}`);
    assert.equal(parsed?.length, 1);
    const ann = annotateRepairQuestions(u, parsed!, 1);
    assert.equal(ann[0]!.id, "r1-1");
    assert.equal(ann[0]!.sourceUrl, u.sourceUrl);
    assert.equal(parseRepairQuestions("kein json"), null);
    assert.equal(parseRepairQuestions('{"questions":[]}'), null);
  });
});

describe("AP-21 applyRepair", () => {
  it("live bei ≥5 bestandenen (alt + neu), durchgefallene Ersatzfragen bleiben draußen", () => {
    const u = unit(6);
    const plan = planQuestionRepair(u, [
      ...["q1", "q2", "q3", "q4"].map((id) => ev(u, id, true)),
      ev(u, "q5", false, "x"),
      ev(u, "q6", false, "y"),
    ]);
    const fresh = annotateRepairQuestions(u, [q("a"), q("b")], 1);
    const out = applyRepair(u, plan, fresh, [qeval(u, "r1-1", true), qeval(u, "r1-2", false)]);
    assert.equal(out.passedCount, 5);
    assert.equal(out.publishable, true);
    assert.equal(out.unit.questions.length, 5);
    assert.ok(!out.unit.questions.some((x) => x.id === "q5" || x.id === "r1-2"));
    assert.equal(out.stillFailedReasons.length, 1);
    assert.match(out.stillFailedReasons[0]!, /r1-2: zwei richtige Antworten/);
  });

  it("bleibt verworfen bei < 5 bestandenen und liefert Folgeplan für nur die neue Fehlfrage", () => {
    const u = unit(6);
    const plan = planQuestionRepair(u, [
      ...["q1", "q2", "q3"].map((id) => ev(u, id, true)),
      ...["q4", "q5", "q6"].map((id) => ev(u, id, false, "z")),
    ]);
    const fresh = annotateRepairQuestions(u, [q("a"), q("b"), q("c")], 1);
    const out = applyRepair(u, plan, fresh, [
      qeval(u, "r1-1", true),
      qeval(u, "r1-2", false),
      qeval(u, "r1-3", false),
    ]);
    assert.equal(out.publishable, false);
    assert.equal(out.nextPlan.kept.length, 4);
    assert.deepEqual(out.nextPlan.failed.map((f) => f.question.id), ["r1-2", "r1-3"]);
    assert.equal(out.nextPlan.replacements, 2);
  });
});

describe("AP-21 Kostenvergleich", () => {
  it("vergleicht € je reparierter Einheit mit dem alten Wert", () => {
    const ledger = { ...emptyLedger(), eurEstimate: 1.0 };
    const c = compareRepairCost(ledger, 25);
    assert.equal(c.oldEurPerUnit, OLD_REGEN_EUR_PER_UNIT);
    assert.equal(c.newEurPerUnit, 0.04);
    assert.equal(c.savingPct, 39);
    assert.equal(compareRepairCost(ledger, 0).newEurPerUnit, null);
  });
});
