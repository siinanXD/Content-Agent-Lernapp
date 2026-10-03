import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explanationFromSections } from "@/lib/content/didaktik";
import { lernfeldIsComplete, mafSeedLernfeldSicherheit } from "./maf-lernfeld-seed";

describe("mafSeedLernfeldSicherheit", () => {
  it("is a complete Lernfeld for AP-05/AP-14/AP-18 acceptance", () => {
    const lf = mafSeedLernfeldSicherheit();
    assert.equal(lernfeldIsComplete(lf), true);
    assert.ok(lf.units.length >= 3);
    assert.equal(lf.moduleId, "M0");
    assert.equal(lf.blockId, "M0-3");
    for (const u of lf.units) {
      assert.equal(u.moduleId, "M0");
      assert.equal(u.blockId, "M0-3");
      assert.equal(u.safetyFlag, true);
    }
  });

  it("stores sections, variant, levels, examAreas and explanation fallback", () => {
    const types = new Set<string>();
    for (const u of mafSeedLernfeldSicherheit().units) {
      assert.match(u.sourceUrl, /^https:\/\//);
      assert.ok(u.questions.length >= 5 && u.questions.length <= 8);
      assert.ok(u.sections);
      assert.equal(u.explanation, explanationFromSections(u.sections!));
      assert.ok(
        u.variant &&
          ["standard", "ablauf", "rechnen", "sicherheit"].includes(u.variant),
      );
      for (const q of u.questions) {
        assert.match(q.sourceUrl, /^https:\/\//);
        assert.ok(q.explanation.length > 10);
        assert.ok(
          q.level && ["erinnern", "verstehen", "anwenden"].includes(q.level),
        );
        assert.ok(q.examAreas && q.examAreas.length > 0);
        types.add(q.type);
        if (q.sampleSolution) {
          assert.ok(q.sampleChecklist && q.sampleChecklist.length > 0);
        }
      }
    }
    for (const t of ["auswahl", "zuordnen", "lueckentext", "reihenfolge", "rechnen"]) {
      assert.ok(types.has(t), `missing type ${t}`);
    }
  });

  it("Phase A images are generated SVG with license fields", () => {
    const withImage = mafSeedLernfeldSicherheit().units.filter((u) => u.image);
    assert.ok(withImage.length >= 1);
    for (const u of withImage) {
      assert.match(u.image!.src, /\.svg$/);
      assert.ok(u.image!.alt.length <= 125);
      assert.equal(u.image!.source.license, "Generated-SVG");
    }
  });
});
