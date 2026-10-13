import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateRates, aggregateScores, type QuestionEval } from "./schemas";

function q(id: string, sourceFidelity: 0 | 1, uniqueness: 0 | 1): QuestionEval {
  return {
    questionId: id,
    unitId: "u1",
    scores: { sourceFidelity, uniqueness, niveau: 4, language: 5, safetyFlag: false },
    passed: sourceFidelity === 1 && uniqueness === 1,
    reasons: [],
  };
}

describe("aggregateRates (SIN-532)", () => {
  const evals = [q("a", 1, 1), q("b", 1, 0), q("c", 0, 1), q("d", 1, 1)];

  it("liefert Quoten über 0 statt Alles-oder-nichts", () => {
    const r = aggregateRates(evals);
    assert.equal(r.sourceFidelity, 0.75);
    assert.equal(r.uniqueness, 0.75);
    assert.equal(r.niveau, 4);
  });

  it("Gate-Aggregat bleibt streng (0 bei einer Ausnahme)", () => {
    assert.equal(aggregateScores(evals).sourceFidelity, 0);
  });

  it("leere Liste gibt 0", () => {
    assert.equal(aggregateRates([]).sourceFidelity, 0);
  });
});
