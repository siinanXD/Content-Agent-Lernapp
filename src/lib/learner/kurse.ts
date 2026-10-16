import type { GeneratedLernfeld, GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import type { CourseStorage } from "@/lib/storage/types";
import { dropDiscardedQuestions } from "./discarded";
import { mapGeneratedToPathUnits } from "./phase-a-path";

export type PathCourse = { id: string; keyword: string; unitCount: number };

/** Einheiten eines Kurses; nur `status = published` (SIN-777), sonst `undefined`. */
export async function loadPublishedCourseUnits(
  storage: CourseStorage,
  courseId: string,
): Promise<{ keyword: string; units: GeneratedUnit[] } | undefined> {
  const course = await storage.getCourse(courseId);
  if (course?.status !== "published") return undefined;
  const units = dropDiscardedQuestions(
    (course.generated as GeneratedLernfeld | undefined)?.units ?? [],
    await storage.listQuestionEvaluations(courseId),
  );
  return { keyword: course.keyword, units };
}

/** Alle veröffentlichten Kurse mit mindestens einer spielbaren Einheit. */
// shortcut: lädt jeden Kurs ganz (listCourses), ausbauen bei vielen Kursen mit eigener Zählabfrage.
export async function listPathCourses(storage: CourseStorage): Promise<PathCourse[]> {
  const published = (await storage.listCourses()).filter((c) => c.status === "published");
  const rows = await Promise.all(
    published.map(async (c) => {
      const loaded = await loadPublishedCourseUnits(storage, c.id);
      const unitCount = mapGeneratedToPathUnits(loaded?.units ?? []).length;
      return { id: c.id, keyword: c.keyword, unitCount };
    }),
  );
  return rows.filter((c) => c.unitCount > 0);
}
