import { getStorage } from "@/lib/storage";

/**
 * Record anonymous learning progress (Zufalls-Kennung only — no PII).
 * POST body: { anonymousId, courseId?, unitId?, questionId?, correct?, durationMs?, abandoned? }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    anonymousId?: string;
    courseId?: string;
    unitId?: string;
    questionId?: string;
    correct?: boolean;
    durationMs?: number;
    abandoned?: boolean;
  };

  if (!body.anonymousId?.trim()) {
    return Response.json(
      { error: "anonymousId_required", mock: true },
      { status: 400 },
    );
  }

  // Reject obvious PII field names if a client sends them.
  const banned = ["email", "name", "fullName", "phone", "userId"] as const;
  for (const key of banned) {
    if (key in (body as Record<string, unknown>)) {
      return Response.json(
        { error: "pii_not_allowed", field: key, mock: true },
        { status: 400 },
      );
    }
  }

  try {
    const storage = getStorage();
    const event = await storage.recordProgress({
      anonymousId: body.anonymousId.trim(),
      courseId: body.courseId,
      unitId: body.unitId,
      questionId: body.questionId,
      correct: body.correct,
      durationMs: body.durationMs,
      abandoned: body.abandoned,
    });
    return Response.json(
      { ...event, storage: storage.backend },
      { status: 201 },
    );
  } catch (err) {
    return Response.json(
      {
        error: "progress_failed",
        message: err instanceof Error ? err.message : String(err),
        mock: true,
      },
      { status: 500 },
    );
  }
}

/** List progress for one anonymous id (query: ?anonymousId=). */
export async function GET(req: Request) {
  const anonymousId = new URL(req.url).searchParams.get("anonymousId")?.trim();
  if (!anonymousId) {
    return Response.json(
      { error: "anonymousId_required", mock: true },
      { status: 400 },
    );
  }
  const storage = getStorage();
  const events = await storage.listProgress(anonymousId);
  return Response.json({
    anonymousId,
    events,
    storage: storage.backend,
  });
}
