import { getStorage } from "@/lib/storage";
import type { GeneratedLernfeld } from "@/lib/generate/maf-lernfeld-seed";
import { dropDiscardedQuestions } from "@/lib/learner/discarded";
import phaseAIndex from "@/lib/learner/phase-a-index.json";

/**
 * Published Phase A units from Supabase (AP-15).
 * Falls back to empty units + index metadata when storage is mock / course missing.
 */
export async function GET(req: Request) {
  const storage = getStorage();
  // SIN-777: `?kurs=<id>` liest einen anderen veröffentlichten Kurs, ohne Angabe der Standardkurs.
  const requested = new URL(req.url).searchParams.get("kurs");
  const courseId = requested || phaseAIndex.courseId;
  if (!courseId) {
    return Response.json({
      ...phaseAIndex,
      units: [],
      source: "empty-index",
    });
  }
  try {
    const course = await storage.getCourse(courseId);
    if (requested && course?.status !== "published") {
      return Response.json({ courseId, units: [], source: "not-published" });
    }
    const generated = course?.generated as GeneratedLernfeld | undefined;
    // SIN-395: verworfene Fragen nie ausspielen.
    const units = dropDiscardedQuestions(
      generated?.units ?? [],
      await storage.listQuestionEvaluations(courseId),
    );
    return Response.json({
      courseId,
      keyword: course?.keyword ?? phaseAIndex.keyword,
      phase: "A",
      status: course?.status ?? "unknown",
      publishedAt: phaseAIndex.publishedAt,
      unitCount: units.length,
      targetUnits: phaseAIndex.targetUnits,
      droppedUnits: phaseAIndex.droppedUnits,
      byModule: phaseAIndex.byModule,
      modules: phaseAIndex.modules,
      units,
      storage: storage.backend,
      source: units.length ? "supabase" : "index-only",
    });
  } catch (err) {
    return Response.json(
      {
        ...phaseAIndex,
        units: [],
        source: "error",
        error: err instanceof Error ? err.message.slice(0, 160) : "load_failed",
      },
      { status: 200 },
    );
  }
}
