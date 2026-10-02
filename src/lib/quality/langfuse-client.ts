/**
 * Langfuse Cloud EU client.
 * Docs: https://langfuse.com/docs · EU region (override with LANGFUSE_BASE_URL)
 * Dataset API: POST /api/public/v2/datasets, POST /api/public/dataset-items
 * Scores: POST /api/public/scores
 * Traces: POST /api/public/ingestion (public ingest)
 */
import { LANGFUSE_DATASET_NAME } from "./maf-goldset";
import type { GoldQuestion } from "./maf-goldset-fixture";

export const LANGFUSE_EU_HOST = ["https://", "cloud.", "langfuse.com"].join("");

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
    baseUrl: process.env.LANGFUSE_BASE_URL?.trim() || LANGFUSE_EU_HOST,
  };
}

export function langfuseConfigured(): boolean {
  return getLangfuseConfig() !== null;
}

function authHeader(cfg: LangfuseConfig): string {
  return `Basic ${Buffer.from(`${cfg.publicKey}:${cfg.secretKey}`).toString("base64")}`;
}

async function langfuseFetch(
  cfg: LangfuseConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: authHeader(cfg),
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Best-effort ingest of an evaluation trace + numeric scores. Never throws.
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
  try {
    const ingest = await langfuseFetch(cfg, "/api/public/ingestion", {
      method: "POST",
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
                dataset: LANGFUSE_DATASET_NAME,
                ...payload.metadata,
              },
            },
          },
        ],
      }),
    });
    if (!ingest.ok) return null;

    const numeric: Array<[string, number]> = [];
    for (const [name, value] of Object.entries(payload.scores)) {
      if (typeof value === "number") numeric.push([name, value]);
      if (typeof value === "boolean") numeric.push([name, value ? 1 : 0]);
    }
    await Promise.all(
      numeric.map(([name, value]) =>
        langfuseFetch(cfg, "/api/public/scores", {
          method: "POST",
          body: JSON.stringify({
            traceId,
            name,
            value,
            dataType: "NUMERIC",
            comment: payload.passed ? "pass" : "below_quality_threshold",
            metadata: { courseId: payload.courseId },
          }),
        }),
      ),
    );
    return traceId;
  } catch {
    return null;
  }
}

export async function ensureGoldsetDataset(items: GoldQuestion[]): Promise<{
  dataset: string;
  upserted: number;
} | null> {
  const cfg = getLangfuseConfig();
  if (!cfg) return null;

  const created = await langfuseFetch(cfg, "/api/public/v2/datasets", {
    method: "POST",
    body: JSON.stringify({
      name: LANGFUSE_DATASET_NAME,
      description:
        "70 original MAF practice items from MaschFüAusbV/BIBB (not IHK exam copies).",
      metadata: {
        retrievedAt: "2026-10-02",
        ihkExamCopy: false,
        itemCount: items.length,
      },
    }),
  });
  // 200/201 create, 409 already exists — both OK
  if (!created.ok && created.status !== 409) return null;

  let upserted = 0;
  for (const item of items) {
    const res = await langfuseFetch(cfg, "/api/public/dataset-items", {
      method: "POST",
      body: JSON.stringify({
        datasetName: LANGFUSE_DATASET_NAME,
        id: `maf-${item.id}`,
        input: {
          prompt: item.prompt,
          correct: item.correct,
          explanation: item.explanation,
          sourceUrl: item.sourceUrl,
          unitId: item.unitId,
        },
        expectedOutput: item.expected,
        metadata: {
          sourceFetchedAt: "sourceFetchedAt" in item ? item.sourceFetchedAt : "2026-10-02",
          ihkExamCopy: false,
        },
        status: "ACTIVE",
      }),
    });
    if (res.ok) upserted += 1;
  }
  return { dataset: LANGFUSE_DATASET_NAME, upserted };
}

export async function fetchGoldsetFromLangfuse(): Promise<GoldQuestion[] | null> {
  const cfg = getLangfuseConfig();
  if (!cfg) return null;
  try {
    const url = `/api/public/dataset-items?datasetName=${encodeURIComponent(LANGFUSE_DATASET_NAME)}&limit=100`;
    const res = await langfuseFetch(cfg, url);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{
        id?: string;
        input?: {
          prompt?: string;
          correct?: string;
          explanation?: string;
          sourceUrl?: string;
          unitId?: string;
        };
        expectedOutput?: GoldQuestion["expected"];
      }>;
    };
    const rows = (body.data ?? [])
      .map((row): GoldQuestion | null => {
        const input = row.input;
        const expected = row.expectedOutput;
        if (!input?.prompt || !input.correct || !input.sourceUrl || !expected) {
          return null;
        }
        return {
          id: (row.id ?? "").replace(/^maf-/, "") || crypto.randomUUID(),
          unitId: input.unitId ?? "lf-unknown",
          prompt: input.prompt,
          correct: input.correct,
          explanation: input.explanation ?? "",
          sourceUrl: input.sourceUrl,
          expected,
        };
      })
      .filter((q): q is GoldQuestion => q !== null);
    return rows.length >= 70 ? rows : null;
  } catch {
    return null;
  }
}
