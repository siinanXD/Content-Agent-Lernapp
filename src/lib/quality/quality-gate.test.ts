import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calibrateGoldsetFixture, fixtureJudge } from "./evaluate-agent";
import { MAF_GOLDSET_FIXTURE } from "./maf-goldset-fixture";
import { LANGFUSE_DATASET_NAME, MAF_GOLDSET_ITEMS } from "./maf-goldset";
import { GOLDSET_TARGET, scoresPass } from "./schemas";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LANGFUSE_EU_HOST,
  LANGFUSE_SDK_MAJOR,
  LANGFUSE_SDK_MIN_VERSION,
  langfuseConfigured,
  recordEvaluationTrace,
} from "./langfuse-client";
import { handleEvaluate, handlePublish } from "@/lib/pipeline/mock-handlers";
import { createCourse, setEvaluation } from "@/lib/pipeline/mock-store";

const qualityDir = dirname(fileURLToPath(import.meta.url));

describe("AP-06 quality gate", () => {
  it("ships 70 original MAF goldset items with official sources", () => {
    assert.equal(MAF_GOLDSET_ITEMS.length, 70);
    assert.equal(LANGFUSE_DATASET_NAME, "maf-goldset-70");
    for (const q of MAF_GOLDSET_ITEMS) {
      assert.equal(q.ihkExamCopy, false, q.id);
      assert.match(q.sourceUrl, /^https:\/\//, q.id);
      assert.doesNotMatch(q.prompt, /geheime ihk|prüfungsaufgabe kop/i, q.id);
      assert.equal(q.expected.uniqueness, 1, q.id);
      assert.equal(q.expected.sourceFidelity, 1, q.id);
      assert.ok(scoresPass(q.expected), q.id);
    }
    const sources = new Set(MAF_GOLDSET_ITEMS.map((q) => q.sourceUrl));
    assert.ok(
      [...sources].some((u) => u.includes("gesetze-im-internet.de/maschf_ausbv")),
    );
  });

  it("defines fixture fail cases for gate calibration", () => {
    assert.ok(MAF_GOLDSET_FIXTURE.length >= 10);
    const cal = calibrateGoldsetFixture();
    assert.ok(cal.failingIds.includes("fx-unique"));
    assert.ok(cal.failingIds.includes("fx-source"));
    assert.equal(cal.target.sampleSize, GOLDSET_TARGET.sampleSize);
  });

  it("fixture judge fails uniqueness and source-fidelity samples", () => {
    const bad = MAF_GOLDSET_FIXTURE.filter((q) => q.id === "fx-unique" || q.id === "fx-source");
    const judged = fixtureJudge(
      bad.map((q) => ({
        id: q.id,
        unitId: q.unitId,
        prompt: q.prompt,
        correct: q.correct,
        explanation: q.explanation,
        sourceUrl: q.sourceUrl,
      })),
    );
    assert.equal(judged.find((j) => j.questionId === "fx-unique")?.passed, false);
    assert.equal(judged.find((j) => j.questionId === "fx-source")?.passed, false);
  });

  it("goldset target meets PRODUCT floors", () => {
    assert.equal(GOLDSET_TARGET.sourceFidelity, 1);
    assert.equal(GOLDSET_TARGET.uniqueness, 1);
    assert.ok(GOLDSET_TARGET.niveau >= 4);
    assert.ok(GOLDSET_TARGET.language >= 4);
    assert.equal(GOLDSET_TARGET.sampleSize, 70);
    assert.ok(LANGFUSE_EU_HOST.startsWith("https://"));
    assert.ok(LANGFUSE_EU_HOST.includes("langfuse.com"));
  });

  it("publish returns 409 without evalua