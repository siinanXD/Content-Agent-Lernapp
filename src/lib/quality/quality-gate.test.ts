import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calibrateGoldsetFixture, fixtureJudge } from "./evaluate-agent";
import { goldsetFixtureAverages, MAF_GOLDSET_FIXTURE } from "./maf-goldset-fixture";
import { GOLDSET_TARGET, scoresPass } from "./schemas";

describe("AP-06 quality gate", () => {
  it("defines goldset fixture with known failures for gate calibration", () => {
    assert.ok(MAF_GOLDSET_FIXTURE.length >= 10);
    const cal = calibrateGoldsetFixture();
    assert.ok(cal.failingIds.includes("g11"));
    assert.ok(cal.failingIds.includes("g12"));
    assert.equal(cal.target.niveau, GOLDSET_TARGET.niveau);
  });

  it("fixture judge fails uniqueness and source-fidelity samples", () => {
    const bad = MAF_GOLDSET_FIXTURE.filter((q) => q.id === "g11" || q.id === "g12");
    const judged = fixtureJudge(
      bad.map((q) => ({
        id: q.id,
        unitId: q.unitId,
        prompt: q.prompt,
        correct: q.correct,
        explanation: q.explanation,
        sourceUrl: q.sourceUrl,
      })),
    );
    assert.equal(judged.find((j) => j.questionId === "g11")?.passed, false);
    assert.equal(judged.find((j) => j.questionId === "g12")?.passed, false);
  });

  it("passable goldset items meet thresholds", () => {
    const good = MAF_GOLDSET_FIXTURE.filter(
      (q) => q.expected.sourceFidelity === 1 && q.expected.uniqueness === 1,
    );
    for (const q of good) {
      assert.equal(scoresPass(q.expected), true, q.id);
    }
    const avg = goldsetFixtureAverages();
    assert.ok(avg.niveau >= 4);
    assert.ok(avg.language >= 4);
  });
});
