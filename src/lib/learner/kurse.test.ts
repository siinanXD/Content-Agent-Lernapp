import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { mockStorage } from "@/lib/storage";
import { listPathCourses, loadPublishedCourseUnits } from "./kurse";

const unit = (id: string, withQuestion = true): GeneratedUnit => ({
  id,
  title: id,
  minutes: 5,
  explanation: "",
  questions: withQuestion
    ? [
        {
          id: id + "-q1",
          type: "mc",
          level: 1,
          prompt: "Frage?",
          choices: ["a", "b"],
          correct: "a",
          explanation: "weil",
          sourceUrl: "https://www.gesetze-im-internet.de/",
          examAreas: [],
        } as unknown as GeneratedUnit["questions"][number],
      ]
    : [],
  sourceUrl: "https://www.gesetze-im-internet.de/",
  sourceFetchedAt: "2026-10-03",
  moduleId: "LF1",
});

async function course(keyword: string, units: GeneratedUnit[], publish = true) {
  const c = await mockStorage.createCourse(keyword);
  await mockStorage.setGenerated(c.id, { id: keyword, title: keyword, focus: keyword, units });
  if (publish) await mockStorage.setStatus(c.id, "published");
  return c;
}

test("zwei veröffentlichte Kurse erscheinen in der Liste und laden ihre Einheiten", async () => {
  const a = await course("Kurs-A-777", [unit("a1")]);
  const b = await course("Kurs-B-777", [unit("b1"), unit("b2")]);
  const list = await listPathCourses(mockStorage);
  assert.equal(list.find((c) => c.id === a.id)?.unitCount, 1);
  assert.equal(list.find((c) => c.id === b.id)?.unitCount, 2);
  assert.deepEqual((await loadPublishedCourseUnits(mockStorage, a.id))?.units.map((u) => u.id), ["a1"]);
  assert.deepEqual((await loadPublishedCourseUnits(mockStorage, b.id))?.units.map((u) => u.id), ["b1", "b2"]);
});

test("Kurs ohne Einheiten oder ohne Veröffentlichung erscheint nicht", async () => {
  const leer = await course("Leer-777", []);
  const ohneFragen = await course("OhneFragen-777", [unit("x1", false)]);
  const entwurf = await course("Entwurf-777", [unit("e1")], false);
  const ids = (await listPathCourses(mockStorage)).map((c) => c.id);
  for (const c of [leer, ohneFragen, entwurf]) assert.ok(!ids.includes(c.id), c.keyword);
  assert.equal(await loadPublishedCourseUnits(mockStorage, entwurf.id), undefined);
});
