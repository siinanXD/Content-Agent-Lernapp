import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  DEFAULT_GENERATOR_MODEL,
  HAIKU_GENERATOR_MODEL,
  generatorModel,
  resolveGeneratorModel,
} from "@/lib/anthropic/client";
import {
  addClaudeUsage,
  claudeUsageUsd,
  emptyLedger,
} from "@/lib/quality/cost-guard";
import { batchRequestParams } from "./batch-generate";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import {
  abChunkTargets,
  AB_UNIT_COUNT,
  planModelAb,
  recommendModel,
  renderReport,
  type AbModelResult,
} from "./model-ab";

describe("AP-22 generator model config", () => {
  const prior = process.env.GENERATOR_MODEL;
  afterEach(() => {
    if (prior === undefined) delete process.env.GENERATOR_MODEL;
    else process.env.GENERATOR_MODEL = prior;
  });

  it("defaults to Sonnet 5.5", () => {
    assert.equal(resolveGeneratorModel(undefined), "claude-sonnet-5-5");
    assert.equal(resolveGeneratorModel("  "), DEFAULT_GENERATOR_MODEL);
  });

  it("accepts Haiku and falls back on unknown ids", () => {
    assert.equal(resolveGeneratorModel("claude-haiku-4-5"), HAIKU_GENERATOR_MODEL);
    assert.equal(resolveGeneratorModel("gpt-4"), DEFAULT_GENERATOR_MODEL);
  });

  it("reads env at call time", () => {
    process.env.GENERATOR_MODEL = HAIKU_GENERATOR_MODEL;
    assert.equal(generatorModel(), HAIKU_GENERATOR_MODEL);
    delete process.env.GENERATOR_MODEL;
    assert.equal(generatorModel(), DEFAULT_GENERATOR_MODEL);
  });
});

describe("AP-22 cost guard per model + cache", () => {
  it("prices Sonnet batch tokens at $1/$5", () => {
    const usd = claudeUsageUsd({ inputTokens: 1e6, outputTokens: 1e6 }, "claude-sonnet-5-5");
    assert.equal(usd, 6);
  });

  it("prices Haiku batch tokens at $0.5/$2.5", () => {
    const usd = claudeUsageUsd({ inputTokens: 1e6, outputTokens: 1e6 }, "claude-haiku-4-5");
    assert.equal(usd, 3);
  });

  it("prices cache write (1h, 2x) and read (0.1x) on the batch input price", () => {
    assert.equal(claudeUsageUsd({ inputTokens: 0, outputTokens: 0, cacheWriteTokens: 1e6 }, "claude-sonnet-5-5"), 2);
    assert.equal(claudeUsageUsd({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 1e6 }, "claude-sonnet-5-5"), 0.1);
    assert.equal(claudeUsageUsd({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 1e6 }, "claude-haiku-4-5"), 0.05);
  });

  it("rejects unknown models", () => {
    assert.throws(() => claudeUsageUsd({ inputTokens: 1, outputTokens: 1 }, "claude-unknown"));
  });

  it("ledger accumulates per-model cost and cache tokens", () => {
    let l = emptyLedger();
    l = addClaudeUsage(l, 1e6, 0, { model: "claude-sonnet-5-5" });
    l = addClaudeUsage(l, 1e6, 0, { model: "claude-haiku-4-5", cacheReadTokens: 1e6 });
    assert.equal(l.claudeUsd, 1 + 0.5 + 0.05);
    assert.equal(l.claudeCacheReadTokens, 1e6);
    assert.equal(l.usdEstimate, 1.55);
  });

  it("legacy token-only ledger keeps Sonnet pricing", () => {
    const l = addClaudeUsage(
      { ...emptyLedger(), claudeInputTokens: 1e6 },
      0,
      0,
    );
    assert.equal(l.usdEstimate, 1);
  });
});

describe("AP-22 batch request caching", () => {
  it("puts the fixed block in system with cache_control and chunk text in the user turn", () => {
    const c = loadMafCurriculum();
    const p = batchRequestParams(c, "claude-haiku-4-5", "chunk");
    assert.equal(p.model, "claude-haiku-4-5");
    assert.equal(p.system[0]?.cache_control.type, "ephemeral");
    assert.ok(p.system[0]!.text.includes("Curriculum-Map"));
    assert.deepEqual(p.messages, [{ role: "user", content: "chunk" }]);
  });

  it("fixed block is identical across chunks (cacheable)", () => {
    const c = loadMafCurriculum();
    const a = batchRequestParams(c, "claude-sonnet-5-5", "a").system[0]!.text;
    const b = batchRequestParams(c, "claude-sonnet-5-5", "b").system[0]!.text;
    assert.equal(a, b);
  });
});

describe("AP-22 A/B dry run", () => {
  it("selects 20 LF3 units", () => {
    const targets = abChunkTargets();
    assert.equal(targets.reduce((s, t) => s + t.unitCount, 0), AB_UNIT_COUNT);
    assert.ok(targets.every((t) => t.module.id === "LF3"));
  });

  it("plan stays under the €3 cap and Haiku is cheaper", () => {
    const plan = planModelAb();
    assert.ok(plan.withinBudget, `preflight €${plan.totalEur}`);
    assert.ok(plan.totalEur < 3);
    assert.ok(plan.preflightUsd["claude-haiku-4-5"]! < plan.preflightUsd["claude-sonnet-5-5"]!);
  });

  it("dry-run report needs no results", () => {
    const md = renderReport({ runId: "t", dryRun: true, plan: planModelAb(), results: [] });
    assert.ok(md.includes("Trockenlauf"));
    assert.ok(md.includes("claude-haiku-4-5"));
  });

  it("recommends Haiku only when it passes the gate", () => {
    const mk = (model: string, niveau: number, language: number, pass: boolean): AbModelResult => ({
      model,
      unitsGenerated: 20,
      failedCustomIds: [],
      questionCount: 100,
      scores: { sourceFidelity: 1, uniqueness: 1, niveau, language, safetyFlag: false },
      passesGate: pass,
      deltaToTarget: { sourceFidelity: 0, uniqueness: 0, niveau: 0, language: 0 },
      costUsd: 1,
      usdPerUnit: 0.05,
    });
    assert.equal(
      recommendModel([mk("claude-sonnet-5-5", 4.2, 4.8, true), mk("claude-haiku-4-5", 4.1, 4.5, true)]),
      "claude-haiku-4-5",
    );
    assert.equal(
      recommendModel([mk("claude-sonnet-5-5", 4.2, 4.8, true), mk("claude-haiku-4-5", 3.5, 4.5, false)]),
      "claude-sonnet-5-5",
    );
  });
});
