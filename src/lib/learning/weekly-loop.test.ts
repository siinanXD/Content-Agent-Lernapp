import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runWeeklyLearningLoop } from "./weekly-loop";

describe("runWeeklyLearningLoop", () => {
  it("ranks five weak units without PII fields", () => {
    const r = runWeeklyLearningLoop();
    assert.equal(r.pii, false);
    assert.equal(r.weakUnits.length, 5);
    assert.equal(r.patches.length, 5);
    for (const u of r.weakUnits) {
      assert.ok(u.unitId);
      assert.ok(!("userId" in u));
    }
  });
});
