import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook — Sentry (optional DSN) + Langfuse OTEL.
 * Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * Docs: https://langfuse.com/docs/observability/sdk/overview
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { ensureLangfuseOtel } = await import("@/lib/quality/langfuse-otel");
    ensureLangfuseOtel();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
