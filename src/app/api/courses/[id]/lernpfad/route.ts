import { loadCoursePath } from "@/lib/learner/shared-path";
import { getStorage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

/** AP-20: Lernpfad eines Kurses inkl. verknüpfter Shared-Module (z. B. M0). */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const storage = getStorage();
  try {
    const path = await loadCoursePath(storage, id);
    if (!path) return Response.json({ error: "course_not_found" }, { status: 404 });
    return Response.json({
      courseId: id,
      unitCount: path.units.length,
      sharedModules: path.sharedModules,
      units: path.units,
      storage: storage.backend,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "lernpfad_failed" },
      { status: 500 },
    );
  }
}
