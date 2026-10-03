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
          ...(payload.