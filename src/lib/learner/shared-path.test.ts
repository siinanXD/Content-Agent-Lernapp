import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { mockStorage } from "@/lib/storage";
import type { CourseStorage } from "@/lib/storage/types";
import { composeCoursePath, loadCoursePath } from "./shared-path";

const unit = (id: string, moduleId: string): GeneratedUnit => ({
  id,
  title: id,
  minutes: 5,
  explanation: "",
  questions: [],
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/",
  sourceFetchedAt: "2026-10-03",
  moduleId,
});

test("composeCoursePath: Shared zuerst, keine Duplikate", () => {
  const link = { key: "maf:M0", moduleId: "M0", sourceCourseId: "x", sortOrder: 0 };
  const path = composeCoursePath(
    [unit("LF1-1-u1", "LF1"), unit("M0-1-u1", "M0")],
    [{ link, units: [unit("M0-1-u1", "M0"), unit("M0-1-u2", "M0")] }],
  );
  assert.deepEqual(path.map((u) => u.id), ["M0-1-u1", "M0-1-u2", "LF1-1-u1"]);
});

test("loadCoursePath zeigt M0 aus dem Quellkurs im Kurs eines anderen Schwerpunkts", async () => {
  const source = await mockStorage.createCourse("Quelle");
  await mockStorage.setGenerated(source.id, {
    id: "q",
    title: "q",
    focus: "q",
    units: [unit("M0-1-u1", "M0"), unit("PA-1-u1", "PA")],
  });
  const target = await mockStorage.createCourse("Kunststoff");
  await mockStorage.setGenerated(target.id, {
    id: "t",
    title: "t",
    focus: "t",
    units: [unit("PA-1-u1-kst", "PA")],
  });
  const storage: CourseStorage = {
    ...mockStorage,
    async listSharedModuleLinks(courseId) {
      return courseId === target.id
        ? [{ key: "maf:M0", moduleId: "M0", sourceCourseId: source.id, sortOrder: 0 }]
        : [];
    },
  };
  const path = await loadCoursePath(storage, target.id);
  assert.deepEqual(path?.units.map((u) => u.id), ["M0-1-u1", "PA-1-u1-kst"]);
  assert.deepEqual(path?.sharedModules, ["maf:M0"]);
});
