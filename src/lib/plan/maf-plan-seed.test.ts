import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mafSeedPlanVariants, planMeetsAcceptance } from "./maf-plan-seed";

describe("mafSeedPlanVariants", () => {
  it("returns two variants meeting AP-04 acceptance", () => {
    const variants = mafSeedPlanVariants();
    assert.equal(variants.length, 2);
    assert.equal(planMeetsAcceptance(variants), true);
    assert.equal(variants[0]!.durationDays, 40);
    assert.equal(variants[1]!.durationDays, 60);
  });

  it("keeps units between 5 and 10 minutes and ~2–3h per day", () => {
    for (const v of mafSeedPlanVariants()) {
      for (const d of v.days) {
        const total = d.units.reduce((s, u) => s + u.minutes, 0);
        assert.ok(total >= 120 && total <= 180, `day ${d.day} total ${total}`);
        for (const u of d.units) {
          assert.ok(u.minutes >= 5 && u.minutes <= 10);
        }
      }
    }
  });
});
