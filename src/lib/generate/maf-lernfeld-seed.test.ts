import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lernfeldIsComplete, mafSeedLernfeldSicherheit } from "./maf-lernfeld-seed";

describe("mafSeedLernfeldSicherheit", () => {
  it("is a complete Lernfeld for AP-05 acceptance", () => {
    const lf = mafSeedLernfeldSicherheit();
    assert.equal(lernfeldIsComplete(lf), true);
    assert.ok(lf.units.length >= 3);
    assert.equal(lf.moduleId, "M0");
    assert.equal(lf.blockId, "M0-3");
  });

  it("stores source links and 5–8 questions per unit", () => {
    for (const u of mafSeedLernfeldSicherheit().units) {
      assert.match(u.sourceUrl, /^https:\/\//);
      assert.ok(u.questions.length >= 5 && u.questions.length <= 8);
      for (const q of u.questions) {
        assert.match(q.sourceUrl, /^https:\/\//);
        assert.ok(q.explanation.length > 10);
      }
    }
  });
});
