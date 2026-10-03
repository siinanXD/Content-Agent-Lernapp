import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { phaseAChunks, UNITS_PER_CHUNK, mergePhaseLernfeld } from "./batch-generate";
import { phaseAPreflightUsd, BUDGET_EUR } from "@/lib/quality/cost-guard";
import { assertPhaseAGoldsetCoverage } from "@/lib/quality/maf-goldset-phase-a";

describe("AP-15 Phase A batch chunks", () => {
  it("covers 280 units across M0/LF1/LF2/PA", () => {
    const { targets, unitTarget } = phaseAChunks("A");
    assert.equal(unitTarget, 280);
    assert.ok(targets.length >= Math.ceil(280 / UNITS_PER_CHUNK));
    const sum = targets.reduce((s, t) => s + t.unitCount, 0);
    assert.equal(sum, 280);
  });

  it("preflight estimate stays under €20 budget", () => {
    const usd = phaseAPreflightUsd(280);
    assert.ok(usd < 18, `preflight $${usd} should be comfortably under €${BUDGET_EUR}`);
  });

  it("goldset has ≥5 items per Phase A module", () => {
    assert.doesNotThrow(() => assertPhaseAGoldsetCoverage(5));
  });

  it("mergePhaseLernfeld dedupes by id", () => {
    const lf = mergePhaseLernfeld([
      {
        id: "M0-3-u1",
        title: "A",
        minutes: 7,
        explanation: "x",
        sourceUrl: "https://example.com",
        sourceFetchedAt: "2026-10-03",
        questions: [],
        moduleId: "M0",
        blockId: "M0-3",
      },
      {
        id: "M0-3-u1",
        title: "B",
        minutes: 7,
        explanation: "y",
        sourceUrl: "https://example.com",
        sourceFetchedAt: "2026-10-03",
        questions: [],
        moduleId: "M0",
        blockId: "M0-3",
      },
    ]);
    assert.equal(lf.units.length, 1);
    assert.equal(lf.units[0]!.title, "B");
  });
});
