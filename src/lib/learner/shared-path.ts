/**
 * AP-20: Lernpfad eines Kurses = eigene Einheiten + Einheiten verknüpfter Shared-Module.
 * Shared-Einheiten werden gelesen, nicht kopiert. Reihenfolge: Modul-Sortierung der Verknüpfung.
 */
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import type { CourseStorage, SharedModuleLink } from "@/lib/storage/types";
import { dropDiscardedQuestions } from "./discarded";

export type SharedPathModule = { link: SharedModuleLink; units: GeneratedUnit[] };

/** Shared-Module zuerst (Querschnitt M0), dann die eigenen Einheiten; keine doppelten Ids. */
export function composeCoursePath(
  own: GeneratedUnit[],
  shared: SharedPathModule[],
): GeneratedUnit[] {
  const seen = new Set<string>();
  const out: GeneratedUnit[] = [];
  const add = (u: GeneratedUnit) => {
    if (seen.has(u.id)) return;
    seen.add(u.id);
    out.push(u);
  };
  for (const s of [...shared].sort((a, b) => a.link.sortOrder - b.link.sortOrder)) {
    for (const u of s.units) add(u);
  }
  for (const u of own) add(u);
  return out;
}

export async function loadCoursePath(
  storage: CourseStorage,
  courseId: string,
): Promise<{ units: GeneratedUnit[]; sharedModules: string[] } | undefined> {
  const course = await storage.getCourse(courseId);
  if (!course) return undefined;
  // SIN-395: verworfene Fragen nie ausspielen (eigene und geteilte Einheiten).
  const own = dropDiscardedQuestions(
    (course.generated as { units?: GeneratedUnit[] } | undefined)?.units ?? [],
    await storage.listQuestionEvaluations(courseId),
  );
  const links = await storage.listSharedModuleLinks(courseId);
  const shared: SharedPathModule[] = [];
  for (const link of links) {
    // Das Modul im eigenen Kurs gilt als Quelle, wenn der Kurs selbst die Quelle ist.
    const source =
      link.sourceCourseId === courseId ? course : await storage.getCourse(link.sourceCourseId);
    const units = dropDiscardedQuestions(
      (source?.generated as { units?: GeneratedUnit[] } | undefined)?.units ?? [],
      await storage.listQuestionEvaluations(link.sourceCourseId),
    ).filter((u) => u.moduleId === link.moduleId);
    shared.push({ link, units });
  }
  return {
    units: composeCoursePath(
      own.filter((u) => !links.some((l) => l.moduleId === u.moduleId)),
      shared,
    ),
    sharedModules: links.map((l) => l.key),
  };
}
