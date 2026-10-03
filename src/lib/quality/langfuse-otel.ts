/**
 * OpenTelemetry bootstrap for Langfuse JS/TS SDK v5 (Langfuse platform v4 ingestion).
 * Docs: https://langfuse.com/docs/observability/sdk/overview
 * Custom ingestion migration: https://langfuse.com/integrations/native/opentelemetry/migration-to-v4
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const LANGFUSE_EU_HOST = ["https://", "cloud.", "langfuse.com"].join("");

let sdk: NodeSDK | null = null;
let processor: LangfuseSpanProcessor | null = null;
let started = false;

function readConfig(): {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
} | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) return null;
  return {
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_BASE_URL?.trim() || LANGFUSE_EU_HOST,
  };
}

/**
 * Start the Langfuse span processor once per process when credentials exist.
 * Safe to call repeatedly (idempotent).
 */
export function ensureLangfuseOtel(): LangfuseSpanProcessor | null {
  if (started) return processor;
  const cfg = readConfig();
  if (!cfg) return null;

  processor = new LangfuseSpanProcessor({
    publicKey: cfg.publicKey,
    secretKey: cfg.secretKey,
    baseUrl: cfg.baseUrl,
  });
  sdk = new NodeSDK({
    spanProcessors: [processor],
  });
  sdk.start();
  started = true;
  return processor;
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
