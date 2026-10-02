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

const BASE = process.env.PILOT_BASE_URL ?? "http://127.0.0.1:43123";

async function post(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { res, json };
}

/** AP-11: end-to-end seed/fixture pilot against local/mock pipeline. */
export async function runMafPilot(): Promise<PilotReport> {
  const steps: PilotStepResult[] = [];
  const keyword = "Maschinen- und Anlagenführer";

  const create = await post("/api/courses", { keyword, variants: 2 });
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
    const { res, json } = await post(`/api/courses/${courseId}/${step}`);
    steps.push({
      step,
      ok: res.ok,
      status: res.status,
      mode: typeof json.mode === "string" ? json.mode : undefined,
      detail: typeof json.warning === "string" ? json.warning.slice(0, 120) : undefined,
    });
  }

  const pub = await post(`/api/courses/${courseId}/publish`);
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
