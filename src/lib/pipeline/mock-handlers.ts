import { getStorage } from "@/lib/storage";
import { runGenerateAgent } from "@/lib/generate/generate-agent";
import { runPlanAgent } from "@/lib/plan/plan-agent";
import { runEvaluateAgent } from "@/lib/quality/evaluate-agent";
import { runResearchAgent } from "@/lib/research/research-agent";

function notFound(id: string) {
  return Response.json(
    { error: "course_not_found", id, mock: true },
    { status: 404 },
  );
}

export async function handleCreateCourse(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    keyword?: string;
    variants?: number;
  };
  if (!body.keyword?.trim()) {
    return Response.json(
      { error: "keyword_required", mock: true },
      { status: 400 },
    );
  }
  const storage = getStorage();
  const course = await storage.createCourse(body.keyword, body.variants ?? 2);
  return Response.json(course, { status: 201 });
}

export async function handleResearch(id: string) {
  const storage = getStorage();
  const course = await storage.getCourse(id);
  if (!course) return notFound(id);
  const result = await runResearchAgent(course.keyword);
  await storage.setSources(id, result.sources);
  return Response.json({
    courseId: id,
    mock: result.mode !== "live",
    mode: result.mode,
    modelId: result.modelId,
    warning: result.warning,
    sources: result.sources,
  });
}

export async function handlePlan(id: string) {
  const storage = getStorage();
  const course = await storage.getCourse(id);
  if (!course) return notFound(id);
  const result = await runPlanAgent(course.keyword);
  await storage.setPlan(id, result.variants);
  return Response.json({
    courseId: id,
    mock: result.mode !== "live",
    mode: result.mode,
    modelId: result.modelId,
    warning: result.warning,
    variants: result.variants,
  });
}

export async function handleGenerate(id: string) {
  const storage = getStorage();
  const course = await storage.getCourse(id);
  if (!course) return notFound(id);
  const result = await runGenerateAgent({ keyword: course.keyword });
  await storage.setGenerated(id, result.lernfeld);
  return Response.json({
    courseId: id,
    mock: result.mode !== "live",
    mode: result.mode,
    modelId: result.modelId,
    batchId: result.batchId,
    warning: result.warning,
    unitsGenerated: result.lernfeld.units.length,
    lernfeld: result.lernfeld,
  });
}

export async function handleEvaluate(id: string) {
  const storage = getStorage();
  const course = await storage.getCourse(id);
  if (!course) return notFound(id);

  type GenQ = {
    id: string;
    unitId: string;
    prompt: string;
    correct: string | string[];
    explanation: string;
    sourceUrl: string;
  };
  let generated: GenQ[] | undefined;
  const lf = course.generated as
    | {
        units?: Array<{
          id: string;
          questions: Array<{
            id: string;
            prompt: string;
            correct: string | string[];
            explanation: string;
            sourceUrl: string;
          }>;
        }>;
      }
    | undefined;
  if (lf?.units?.length) {
    generated = lf.units.flatMap((u) =>
      u.questions.map((q) => ({
        id: `${u.id}-${q.id}`,
        unitId: u.id,
        prompt: q.prompt,
        correct: q.correct,
        explanation: q.explanation,
        sourceUrl: q.sourceUrl,
      })),
    );
  }

  const result = await runEvaluateAgent({ courseId: id, generated });
  await storage.setEvaluation(id, result);
  return Response.json({
    mock: result.mode !== "live",
    ...result,
  });
}

export async function handlePublish(id: string) {
  const storage = getStorage();
  const course = await storage.getCourse(id);
  if (!course) return notFound(id);
  const evaluation = course.evaluation as
    | { passed?: boolean; scores?: Record<string, number>; questions?: Array<{ passed: boolean }> }
    | undefined;
  if (!evaluation) {
    return Response.json(
      {
        error: "evaluate_required",
        message: "Run /evaluate before /publish. Quality gate blocks unreviewed content.",
        mock: true,
      },
      { status: 409 },
    );
  }
  if (!evaluation.passed) {
    const blocked =
      evaluation.questions?.filter((q) => !q.passed).length ?? 0;
    return Response.json(
      {
        courseId: id,
        publishedUnits: 0,
        blockedUnits: blocked,
        blocked: true,
        reason: "below_quality_threshold",
        scores: evaluation.scores,
        mock: true,
      },
      { status: 422 },
    );
  }
  await storage.setStatus(id, "published");
  const published =
    (course.generated as { units?: unknown[] } | undefined)?.units?.length ?? 0;
  return Response.json({
    courseId: id,
    publishedUnits: published,
    blockedUnits: 0,
    blocked: false,
    mock: course.mock,
    storage: storage.backend,
  });
}

export type RefreshBody = {
  mapId?: string;
  sourceIds?: string[];
  moduleIds?: string[];
  blockIds?: string[];
};

/**
 * Selective refresh (AP-16): Hermes passes module/block/source ids derived from
 * curriculum `sourceIds` so only affected content is regenerated.
 * Course lookup via AP-17 storage layer.
 */
export async function handleRefresh(id: string, req?: Request) {
  const storage = getStorage();
  const course = await storage.getCourse(id);
  if (!course) return notFound(id);
  const body = (req ? await req.json().catch(() => ({})) : {}) as RefreshBody;
  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.filter((x) => typeof x === "string")
    : [];
  const moduleIds = Array.isArray(body.moduleIds)
    ? body.moduleIds.filter((x) => typeof x === "string")
    : [];
  const blockIds = Array.isArray(body.blockIds)
    ? body.blockIds.filter((x) => typeof x === "string")
    : [];
  const selective = sourceIds.length + moduleIds.length + blockIds.length > 0;
  return Response.json({
    courseId: id,
    mapId: body.mapId ?? null,
    sourcesChanged: selective,
    selective,
    sourceIds,
    moduleIds,
    blockIds,
    mock: true,
    storage: storage.backend,
  });
}
