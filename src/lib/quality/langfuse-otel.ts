/**
 * OpenTelemetry bootstrap for Langfuse JS/TS SDK v5 (Langfuse platform v4 ingestion).
 * Docs: https://langfuse.com/docs/observability/sdk/overview
 * Custom ingestion migration: https://langfuse.com/integrations/native/opentelemetry/migration-to-v4
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { cleanEnvValue, readEnvUrl } from "@/lib/env";

const LANGFUSE_EU_HOST = ["https://", "cloud.", "langfuse.com"].join("");

let sdk: NodeSDK | null = null;
let processor: LangfuseSpanProcessor | null = null;
let started = false;

function readConfig(): {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
} | null {
  const publicKey = cleanEnvValue(process.env.LANGFUSE_PUBLIC_KEY);
  const secretKey = cleanEnvValue(process.env.LANGFUSE_SECRET_KEY);
  if (!publicKey || !secretKey) return null;
  const hasBaseUrl = Boolean(cleanEnvValue(process.env.LANGFUSE_BASE_URL));
  const baseUrl = readEnvUrl("LANGFUSE_BASE_URL") ?? (hasBaseUrl ? null : LANGFUSE_EU_HOST);
  if (!baseUrl) return null;
  return { publicKey, secretKey, baseUrl };
}

/**
 * Start the Langfuse span processor once per process when credentials exist.
 * Safe to call repeatedly (idempotent).
 */
export function ensureLangfuseOtel(): LangfuseSpanProcessor | null {
  if (started) return processor;
  try {
    const cfg = readConfig();
    if (!cfg) return null;

    const nextProcessor = new LangfuseSpanProcessor({
      publicKey: cfg.publicKey,
      secretKey: cfg.secretKey,
      baseUrl: cfg.baseUrl,
    });
    const nextSdk = new NodeSDK({ spanProcessors: [nextProcessor] });
    nextSdk.start();
    processor = nextProcessor;
    sdk = nextSdk;
    started = true;
    return processor;
  } catch (err) {
    // Tracing darf die App nie lahmlegen (SIN-308).
    console.warn(
      `[langfuse] Tracing abgeschaltet: ${err instanceof Error ? err.message : "Start fehlgeschlagen"}`,
    );
    processor = null;
    sdk = null;
    started = true;
    return null;
  }
}

/** Flush pending OTEL spans (required in short-lived scripts / request handlers). */
export async function flushLangfuseOtel(): Promise<void> {
  if (processor) {
    await processor.forceFlush();
  }
}

/** Graceful shutdown for CLI scripts. */
export async function shutdownLangfuseOtel(): Promise<void> {
  if (processor) {
    await processor.forceFlush();
  }
  if (sdk) {
    await sdk.shutdown();
  }
  sdk = null;
  processor = null;
  started = false;
}
