import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";
import {
  getStorage,
  getStorageBackend,
  preferMockStorage,
  setStorageForTests,
  supabaseSecretsPresent,
} from "./index";
import { clearMockProgress, mockStorage } from "./mock-adapter";

describe("storage layer (AP-17)", () => {
  afterEach(() => {
    setStorageForTests(null);
    clearMockProgress();
    delete process.env.COURSE_STORAGE;
  });

  it("uses mock when Supabase secrets are absent or COURSE_STORAGE=mock", () => {
    // Cloud Agents often inject SUPABASE_*; npm test sets COURSE_STORAGE=mock.
    if (!supabaseSecretsPresent()) {
      assert.equal(preferMockStorage(), true);
    } else {
      process.env.COURSE_STORAGE = "mock";
      assert.equal(preferMockStorage(), true);
    }
    assert.equal(getStorageBackend(), "mock");
  });

  it("COURSE_STORAGE=mock forces mock even if forced supabase intent", () => {
    process.env.COURSE_STORAGE = "mock";
    assert.equal(preferMockStorage(), true);
    assert.equal(getStorage().backend, "mock");
  });

  it("mock adapter persists course pipeline fields in-memory", async () => {
    setStorageForTests(mockStorage);
    const course = await mockStorage.createCourse("Maschinen- und Anlagenführer", 2);
    assert.equal(course.status, "created");
    assert.equal(course.mock, true);

    await mockStorage.setSources(course.id, [
      {
        title: "AO",
        url: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html",
        fetchedAt: "2026-10-03T00:00:00.000Z",
      },
    ]);
    const researched = await mockStorage.getCourse(course.id);
    assert.equal(researched?.status, "researched");
    assert.equal(researched?.sources?.length, 1);

    await mockStorage.setPlan(course.id, [{ name: "v1", days: [] }]);
    await mockStorage.setGenerated(course.id, mafSeedLernfeldSicherheit());
    const generated = await mockStorage.getCourse(course.id);
    assert.equal(generated?.status, "generated");
    assert.ok(
      (generated?.generated as { units?: unknown[] })?.units?.length,
    );

    await mockStorage.setEvaluation(course.id, {
      courseId: course.id,
      passed: true,
      scores: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4 },
    });
    await mockStorage.setStatus(course.id, "published");
    assert.equal((await mockStorage.getCourse(course.id))?.status, "published");
  });

  it("records learning progress with anonymous id only", async () => {
    const anonymousId = crypto.randomUUID();
    const event = await mockStorage.recordProgress({
      anonymousId,
      unitId: "unit-03",
      questionId: "q1",
      correct: true,
      durationMs: 1200,
    });
    assert.equal(event.anonymousId, anonymousId);
    assert.equal(event.correct, true);
    const listed = await mockStorage.listProgress(anonymousId);
    assert.equal(listed.length, 1);
  });
});
