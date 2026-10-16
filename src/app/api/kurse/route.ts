import { listPathCourses } from "@/lib/learner/kurse";
import phaseAIndex from "@/lib/learner/phase-a-index.json";
import { getStorage } from "@/lib/storage";

/** SIN-777: veröffentlichte Kurse mit Einheiten; `standardId` ist der Kurs hinter `/lernpfad`. */
export async function GET() {
  try {
    return Response.json({
      standardId: phaseAIndex.courseId,
      courses: await listPathCourses(getStorage()),
    });
  } catch {
    return Response.json({ standardId: phaseAIndex.courseId, courses: [] });
  }
}
