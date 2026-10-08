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
import { createCourse, setEvaluation, setGenerated, setSources } from "@/lib/pipeline/mock-store";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";

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
    assert.ok(new URL(LANGFUSE_EU_HOST).hostname === "cloud.langfuse.com");
  });

  it("publish returns 409 without evaluate and 422 below threshold", async () => {
    const course = createCourse("Maschinen- und Anlagenführer");
    const blocked = await handlePublish(course.id);
    assert.equal(blocked.status, 409);

    setEvaluation(course.id, {
      passed: false,
      scores: { sourceFidelity: 0, uniqueness: 1, niveau: 2, language: 2, safetyFlag: false },
      questions: [{ passed: false }],
    });
    const rejected = await handlePublish(course.id);
    assert.equal(rejected.status, 422);
    const body = (await rejected.json()) as { reason?: string };
    assert.equal(body.reason, "below_quality_threshold");

    const okCourse = createCourse("MAF pass");
    setSources(okCourse.id, [
      { title: "AO", url: "https://www.gesetze-im-internet.de/maschf_ausbv/", fetchedAt: "2026-10-02T00:00:00.000Z" },
    ]);
    setGenerated(okCourse.id, mafSeedLernfeldSicherheit());
    setEvaluation(okCourse.id, {
      passed: true,
      scores: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: false },
      questions: [{ passed: true }],
    });
    const published = await handlePublish(okCourse.id);
    assert.equal(published.status, 200);
  });


  it("targets Langfuse JS/TS SDK v5 (≥5.4.0) without legacy ingestion REST", () => {
    assert.equal(LANGFUSE_SDK_MAJOR, 5);
    assert.equal(LANGFUSE_SDK_MIN_VERSION, "5.4.0");
    const clientSrc = readFileSync(join(qualityDir, "langfuse-client.ts"), "utf8");
    const otelSrc = readFileSync(join(qualityDir, "langfuse-otel.ts"), "utf8");
    assert.doesNotMatch(clientSrc, /\/api\/public\/ingestion/);
    assert.doesNotMatch(clientSrc, /trace-create/);
    assert.match(clientSrc, /@langfuse\/tracing/);
    assert.match(clientSrc, /propagateAttributes/);
    assert.match(clientSrc, /startActiveObservation/);
    assert.match(otelSrc, /LangfuseSpanProcessor/);
    assert.match(otelSrc, /@langfuse\/otel/);
  });

  it("recordEvaluationTrace is a no-op without LANGFUSE_* credentials", async () => {
    const prevPub = process.env.LANGFUSE_PUBLIC_KEY;
    const prevSec = process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    try {
      assert.equal(langfuseConfigured(), false);
      const tid = await recordEvaluationTrace({
        name: "course-evaluate",
        courseId: "c-test",
        passed: true,
        scores: { sourceFidelity: 1 },
      });
      assert.equal(tid, null);
    } finally {
      if (prevPub) process.env.LANGFUSE_PUBLIC_KEY = prevPub;
      if (prevSec) process.env.LANGFUSE_SECRET_KEY = prevSec;
    }
  });

  it("evaluate records a result the publish gate can read", async () => {
    const openai = process.env.OPENAI_API_KEY;
    const lfPub = process.env.LANGFUSE_PUBLIC_KEY;
    const lfSec = process.env.LANGFUSE_SECRET_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    try {
      const course = createCourse("MAF evaluate");
      const res = await handleEvaluate(course.id);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { passed?: boolean; mode?: string; courseId?: string };
      assert.equal(body.courseId, course.id);
      assert.equal(body.mode, "fixture");
    } finally {
      if (openai) process.env.OPENAI_API_KEY = openai;
      if (lfPub) process.env.LANGFUSE_PUBLIC_KEY = lfPub;
      if (lfSec) process.env.LANGFUSE_SECRET_KEY = lfSec;
    }
  });
});
