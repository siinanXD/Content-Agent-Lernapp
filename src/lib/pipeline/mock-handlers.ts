import { createCourse, getCourse, setGenerated, setPlan, setSources, setStatus } from "./mock-store";
import { runGenerateAgent } from "@/lib/generate/generate-agent";
import { runPlanAgent } from "@/lib/plan/plan-agent";
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

export function handleEvaluate(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  setStatus(id, "evaluated");
  return Response.json({
    courseId: id,
    passed: true,
    scores: {
      sourceFidelity: 1,
      uniqueness: 1,
      niveau: 4,
      language: 4,
    },
    mock: true,
  });
}

export function handlePublish(id: string) {
  const course = getCourse(id);
  if (!course) return notFound(id);
  setStatus(id, "published");
  return Response.json({
    courseId: id,
    publishedUnits: 3,
    blockedUnits: 0,
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
