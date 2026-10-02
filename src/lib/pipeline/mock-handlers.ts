import {
  createCourse,
  getCourse,
  setEvaluation,
  setGenerated,
  setPlan,
  setSources,
  setStatus,
} from "./mock-store";
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
  const course = createCourse(body.keyword, body.variants ?? 2);
  return Response.json(course, { status: 201 });
}

export async function handleResearch(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  const result = await runResearchAgent(course.keyword);
  setSources(id, result.sources);
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
  const course = getCourse(id);
  if (!course) return notFound(id);
  const result = await runPlanAgent(course.keyword);
  setPlan(id, result.variants);
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
  const course = getCourse(id);
  if (!course) return notFound(id);
  const result = await runGenerateAgent({ keyword: course.keyword });
  setGenerated(id, result.lernfeld);
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
  const course = getCourse(id);
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
  setEvaluation(id, result);
  return Response.json({
    mock: result.mode !== "live",
    ...result,
  });
}

export function handlePublish(id: string) {
  const course = getCourse(id);
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
  setStatus(id, "published");
  const published =
    (course.generated as { units?: unknown[] } | undefined)?.units?.length ?? 0;
  return Response.json({
    courseId: id,
    publishedUnits: published,
    blockedUnits: 0,
    blocked: false,
    mock: true,
  });
}

export function handleRefresh(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  return Response.json({
    courseId: id,
    sourcesChanged: false,
    mock: true,
  });
}
