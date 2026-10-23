import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunkBatchRequests, failedRunReason, phaseAChunks, rowError, UNITS_PER_CHUNK, mergePhaseLernfeld } from "./batch-generate";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import { phaseAPreflightUsd, BUDGET_EUR } from "@/lib/quality/cost-guard";
import { assertPhaseAGoldsetCoverage } from "@/lib/quality/maf-goldset-phase-a";

describe("SIN-489 Structured Outputs", () => {
  const c = loadMafCurriculum();
  const { targets } = phaseAChunks("A", c);
  const build = () => chunkBatchRequests({ keyword: "t", curriculum: c, targets: targets.slice(0, 2) });

  it("SIN-1036: jede Anfrage enthält immer output_config.format mit json_schema (ohne Schalter)", () => {
    const reqs = build();
    assert.equal(reqs.length, 2);
    for (const r of reqs) {
      const f = (r.params as { output_config: { format: { type: string; schema: unknown } } }).output_config.format;
      assert.equal(f.type, "json_schema");
      assert.equal((f.schema as { additionalProperties: boolean }).additionalProperties, false);
      assert.ok(!("output_format" in r.params));
    }
  });
});

describe("SIN-497 Fehler gescheiterter Batch-Zeilen", () => {
  it("rowError liest Typ und Text, auch verschachtelt", () => {
    const flat = rowError({ custom_id: "a", result: { type: "errored", error: { type: "invalid_request_error", message: "Schema\n zu komplex" } } });
    assert.equal(flat.error, "invalid_request_error: Schema zu komplex");
    const nested = rowError({
      custom_id: "b",
      result: { type: "errored", error: { type: "error", error: { type: "invalid_request_error", message: "x" } } },
    });
    assert.equal(nested.error, "invalid_request_error: x");
    assert.equal(rowError({ custom_id: "c", result: { type: "expired" } }).error, "unbekannt");
  });

  it("Lauf rot bei 0 Einheiten oder über 50 % gescheitert", () => {
    assert.match(failedRunReason(0, 10, 10) ?? "", /0 Einheiten/);
    assert.match(failedRunReason(4, 6, 10) ?? "", /über 50 %/);
    assert.equal(failedRunReason(8, 5, 10), null);
    assert.equal(failedRunReason(0, 0, 0), null);
  });
});

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
