import {
  handleCreateCourse,
  handleEvaluate,
  handleGenerate,
  handlePlan,
  handlePublish,
  handleResearch,
} from "@/lib/pipeline/mock-handlers";

export type PilotStepResult = {
  step: string;
  ok: boolean;
  mode?: string;
  detail?: string;
  status?: number;
};

export type PilotReport = {
  keyword: string;
  courseId?: string;
  liveLlm: false;
  estimatedCostEur: 0;
  ceilingEur: 20;
  steps: PilotStepResult[];
  passed: boolean;
};

/** Ruft die Pipeline-Handler direkt auf: die HTTP-Routen verlangen seit SIN-1178 ein Admin-Token. */
async function run(call: () => Promise<Response>) {
  const res = await call();
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json };
}

const STEP_HANDLERS = {
  research: handleResearch,
  plan: handlePlan,
  generate: handleGenerate,
  evaluate: handleEvaluate,
} as const;

/** AP-11: end-to-end seed/fixture pilot against local/mock pipeline. */
export async function runMafPilot(): Promise<PilotReport> {
  const steps: PilotStepResult[] = [];
  const keyword = "Maschinen- und Anlagenführer";

  const create = await run(() =>
    handleCreateCourse(
      new Request("http://pilot.local/api/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword, variants: 2 }),
      }),
    ),
  );
  const courseId = String(create.json.id ?? "");
  steps.push({
    step: "create",
    ok: create.res.status === 201 && !!courseId,
    status: create.res.status,
    detail: courseId || String(create.json.error ?? ""),
  });
  if (!courseId) {
    return {
      keyword,
      liveLlm: false,
      estimatedCostEur: 0,
      ceilingEur: 20,
      steps,
      passed: false,
    };
  }

  for (const step of ["research", "plan", "generate", "evaluate"] as const) {
    const { res, json } = await run(() => STEP_HANDLERS[step](courseId));
    steps.push({
      step,
      ok: res.ok,
      status: res.status,
      mode: typeof json.mode === "string" ? json.mode : undefined,
      detail: typeof json.warning === "string" ? json.warning.slice(0, 120) : undefined,
    });
  }

  const pub = await run(() => handlePublish(courseId));
  const blocked = pub.json.blocked === true;
  steps.push({
    step: "publish",
    ok: pub.res.ok && !blocked,
    status: pub.res.status,
    detail: blocked ? "blocked" : `publishedUnits=${String(pub.json.publishedUnits ?? "")}`,
  });

  return {
    keyword,
    courseId,
    liveLlm: false,
    estimatedCostEur: 0,
    ceilingEur: 20,
    steps,
    passed: steps.every((s) => s.ok),
  };
}
