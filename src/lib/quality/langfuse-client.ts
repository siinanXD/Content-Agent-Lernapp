/**
 * Langfuse EU client stub. Live only when LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY set.
 * Docs: https://langfuse.com/docs · EU https://cloud.langfuse.com
 */
export type LangfuseConfig = {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
};

export function getLangfuseConfig(): LangfuseConfig | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) return null;
  return {
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_BASE_URL?.trim() || "https://cloud.langfuse.com",
  };
}

export function langfuseConfigured(): boolean {
  return getLangfuseConfig() !== null;
}

/**
 * Best-effort ingest of an evaluation trace. Never throws; returns trace id or null.
 * Uses Langfuse public ingestion API when keys exist.
 */
export async function recordEvaluationTrace(payload: {
  name: string;
  courseId: string;
  passed: boolean;
  scores: Record<string, number | boolean>;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const cfg = getLangfuseConfig();
  if (!cfg) return null;

  const traceId = crypto.randomUUID();
  const auth = Buffer.from(`${cfg.publicKey}:${cfg.secretKey}`).toString("base64");
  try {
    const res = await fetch(`${cfg.baseUrl}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        batch: [
          {
            id: crypto.randomUUID(),
            type: "trace-create",
            timestamp: new Date().toISOString(),
            body: {
              id: traceId,
              name: payload.name,
              metadata: {
                courseId: payload.courseId,
                passed: payload.passed,
                scores: payload.scores,
                ...payload.metadata,
              },
            },
          },
        ],
      }),
    });
    if (!res.ok) return null;
    return traceId;
  } catch {
    return null;
  }
}
