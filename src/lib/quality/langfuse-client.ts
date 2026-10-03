/**
 * Langfuse Cloud EU client — JS/TS SDK v5 (platform v4 / observations-first).
 *
 * Docs:
 * - https://langfuse.com/docs/observability/sdk/overview
 * - https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5
 * - https://langfuse.com/integrations/native/opentelemetry/migration-to-v4
 * - https://langfuse.com/faq/all/deprecated-api-migration
 *
 * Ingestion uses OTLP via @langfuse/otel (not the legacy public REST ingest API).
 * Scores use LangfuseClient.score (supported batched score events).
 * Datasets use LangfuseClient api.datasets + dataset.createItem / dataset.get.
 */
import { LangfuseClient } from "@langfuse/client";
import {
  getActiveTraceId,
  propagateAttributes,
  startActiveObservation,
} from "@langfuse/tracing";
import { LANGFUSE_DATASET_NAME } from "./maf-goldset";
import type { GoldQuestion } from "./maf-goldset-fixture";
import {
  ensureLangfuseOtel,
  flushLangfuseOtel,
} from "./langfuse-otel";

export const LANGFUSE_EU_HOST = ["https://", "cloud.", "langfuse.com"].join("");

/** Declared SDK major used by this repo (resolved versions are in package-lock.json). */
export const LANGFUSE_SDK_MAJOR = 5 as const;
export const LANGFUSE_SDK_MIN_VERSION = "5.4.0" as const;

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

function createClient(cfg: LangfuseConfig): LangfuseClient {
  return new LangfuseClient({
    publicKey: cfg.publicKey,
    secretKey: cfg.secretKey,
    baseUrl: cfg.baseUrl,
  });
}

/** Stringify metadata values for propagateAttributes (Record<string, string>, ≤200 chars). */
function stringMetadata(
  input: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const raw =
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
    out[key] = raw.length <= 200 ? raw : `${raw.slice(0, 197)}...`;
  }
  return out;
}

/**
 * Best-effort evaluation observation + numeric scores. Never throws.
 * Root observation carries overall input/output (v4 observations-first model).
 * Correlating attributes are set via propagateAttributes before the observation.
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

  try {
    ensureLangfuseOtel();
    const client = createClient(cfg);

    let traceId: string | undefined;

    await propagateAttributes(
      {
        traceName: payload.name,
        tags: ["quality-gate", "course-evaluate", "ap-06"],
        metadata: stringMetadata({
          courseId: payload.courseId,
          dataset: LANGFUSE_DATASET_NAME,
          passed: payload.passed,
          ...(payload.metadata ?? {}),
        }),
      },
      async () => {
        await startActiveObservation(
          payload.name,
          async (observation) => {
            observation.update({
              input: {
                courseId: payload.courseId,
                name: payload.name,
              },
              output: {
                passed: payload.passed,
                scores: payload.scores,
              },
              metadata: {
                courseId: payload.courseId,
                dataset: LANGFUSE_DATASET_NAME,
              },
            });

            traceId = getActiveTraceId() ?? observation.traceId;

            for (const [name, value] of Object.entries(payload.scores)) {
              const numeric =
                typeof value === "number"
                  ? value
                  : typeof value === "boolean"
                    ? value
                      ? 1
                      : 0
                    : null;
              if (numeric === null) continue;
              // Observation-level scores (v4 evaluators target observations).
              client.score.observation(
                { otelSpan: observation.otelSpan },
                {
                  name,
                  value: numeric,
                  dataType: "NUMERIC",
                  comment: payload.passed ? "pass" : "below_quality_threshold",
                  metadata: { courseId: payload.courseId },
                },
              );
            }
          },
          { asType: "evaluator" },
        );
      },
    );

    await client.score.flush();
    await flushLangfuseOtel();
    return traceId ?? null;
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

  try {
    const client = createClient(cfg);

    try {
      await client.api.datasets.create({
        name: LANGFUSE_DATASET_NAME,
        description:
          "70 original MAF practice items from MaschFüAusbV/BIBB (not IHK exam copies).",
        metadata: {
          retrievedAt: "2026-10-02",
          ihkExamCopy: false,
          itemCount: items.length,
        },
      });
    } catch {
      // Dataset may already exist (409) — continue upserting items.
    }

    let upserted = 0;
    for (const item of items) {
      try {
        await client.dataset.createItem({
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
            sourceFetchedAt:
              "sourceFetchedAt" in item ? item.sourceFetchedAt : "2026-10-02",
            ihkExamCopy: false,
          },
          status: "ACTIVE",
        });
        upserted += 1;
      } catch {
        // skip failed item; continue
      }
    }
    return { dataset: LANGFUSE_DATASET_NAME, upserted };
  } catch {
    return null;
  }
}

export async function fetchGoldsetFromLangfuse(): Promise<GoldQuestion[] | null> {
  const cfg = getLangfuseConfig();
  if (!cfg) return null;
  try {
    const client = createClient(cfg);
    const dataset = await client.dataset.get(LANGFUSE_DATASET_NAME, {
      fetchItemsPageSize: 100,
    });
    const rows = (dataset.items ?? [])
      .map((row): GoldQuestion | null => {
        const input = row.input as
          | {
              prompt?: string;
              correct?: string;
              explanation?: string;
              sourceUrl?: string;
              unitId?: string;
            }
          | undefined;
        const expected = row.expectedOutput as GoldQuestion["expected"] | undefined;
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
