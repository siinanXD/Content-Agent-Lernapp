import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_GENERATOR_MODEL, resolveGeneratorModel } from "./client";
import { claudeBatchUsd } from "@/lib/quality/cost-guard";

test("resolveGeneratorModel: Default, Override, unbekannt", () => {
  assert.equal(resolveGeneratorModel(undefined), DEFAULT_GENERATOR_MODEL);
  assert.equal(resolveGeneratorModel("  "), DEFAULT_GENERATOR_MODEL);
  assert.equal(resolveGeneratorModel("claude-haiku-4-5-20251001"), "claude-haiku-4-5-20251001");
  assert.throws(() => resolveGeneratorModel("claude-haiku-4-5"), /unbekannt/);
});

test("claudeBatchUsd: Batch-Preise inkl. Cache-Faktoren", () => {
  const usage = {
    claudeInputTokens: 1_000_000,
    claudeOutputTokens: 1_000_000,
    claudeCacheCreationTokens: 1_000_000,
    claudeCacheReadTokens: 1_000_000,
  };
  // Haiku 4.5: 0.5 + 2.5 + 0.5*1.25 + 0.5*0.1
  assert.equal(claudeBatchUsd("claude-haiku-4-5-20251001", usage), 3.675);
  // Sonnet 5.5: 1 + 5 + 1.25 + 0.1
  assert.equal(claudeBatchUsd("claude-sonnet-5-5", usage), 7.35);
  assert.throws(() => claudeBatchUsd("x", usage), /Kein Batch-Preis/);
});
