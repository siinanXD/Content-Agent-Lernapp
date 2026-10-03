import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import {
  buildBlockGeneratePrompt,
  findCurriculumBlock,
  runGenerateAgent,
} from "./generate-agent";
import { lernfeldIsComplete, mafSeedLernfeldSicherheit } from "./maf-lernfeld-seed";

describe("generate-agent curriculum bind (AP-14)", () => {
  it("seed path annotates M0-3 moduleId/blockId and safetyFlag", () => {
    const lf = mafSeedLernfeldSicherheit();
    assert.equal(lf.moduleId, "M0");
    assert.equal(lf.blockId, "M0-3");
    assert.equal(lernfeldIsComplete(lf), true);
    for (const u of lf.units) {
      assert.equal(u.moduleId, "M0");
      assert.equal(u.blockId, "M0-3");
      assert.equal(u.safetyFlag, true);
    }
  });

  it("builds Didaktik per-block prompt with topics, sources, mix, and bans", () => {
    const c = loadMafCurriculum();
    const found = findCurriculumBlock("M0-3", c);
    assert.ok(found);
    const prompt = buildBlockGeneratePrompt(c, found!.module, found!.block);
    assert.match(prompt, /M0-3|Sicherheit/);
    assert.match(prompt, /moduleId="M0"/);
    assert.match(prompt, /blockId="M0-3"/);
    assert.match(prompt, /variant="sicherheit"/);
    assert.match(prompt, /IHK/);
    assert.match(prompt, /Personendaten/);
    assert.match(prompt, /safetyFlag/);
    assert.match(prompt, /sections/);
    assert.match(prompt, /https:\/\//);
    assert.match(prompt, /auswahl=/);
  });

  it("rechnen blocks ask for Rechenweg via Didaktik variant", () => {
    const c = loadMafCurriculum();
    const rechnen = c.modules
      .flatMap((m) => m.blocks.map((b) => ({ m, b })))
      .find(({ b }) => b.rechnen);
    assert.ok(rechnen, "expected at least one rechnen block in curriculum");
    const prompt = buildBlockGeneratePrompt(c, rechnen!.m, rechnen!.b);
    assert.match(prompt, /Rechenweg|rechnen/i);
  });

  it("runGenerateAgent without key returns curriculum-tagged seed", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await runGenerateAgent({ keyword: "Maschinen- und Anlagenführer" });
    assert.equal(result.mode, "seed");
    assert.equal(result.lernfeld.moduleId, "M0");
    assert.equal(result.lernfeld.blockId, "M0-3");
  });
});
