import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadMafCurriculum } from "@/lib/content/maf-curriculum";
import {
  curriculumSlots,
  interleavedCurriculumUnits,
  mafSeedPlanVariants,
  planMeetsAcceptance,
} from "./maf-plan-seed";

describe("mafSeedPlanVariants", () => {
  it("returns two variants meeting AP-04/AP-14 acceptance", () => {
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
          assert.ok(u.moduleId);
          assert.ok(u.blockId);
          assert.ok(u.niveau);
          assert.ok(u.sourceKind);
        }
      }
    }
  });

  it("interleaves M0 about every fifth unit", () => {
    const iter = interleavedCurriculumUnits(loadMafCurriculum());
    const sample: string[] = [];
    for (let i = 0; i < 20; i++) sample.push(iter.next().value!.moduleId);
    for (let i = 1; i <= 20; i++) {
      if (i % 5 === 0) assert.equal(sample[i - 1], "M0", `unit ${i}`);
      else assert.notEqual(sample[i - 1], "M0", `unit ${i}`);
    }
  });

  it("walks non-M0 modules from the curriculum map", () => {
    const { main, m0 } = curriculumSlots();
    assert.ok(m0.length >= 60);
    assert.ok(main.length >= 800);
    const first = mafSeedPlanVariants()[0]!.days[0]!.units[0]!;
    assert.notEqual(first.moduleId, "M0");
  });
});
