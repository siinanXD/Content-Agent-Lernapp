import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook — Sentry (optional DSN) + Langfuse OTEL.
 * Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * Docs: https://langfuse.com/docs/observability/sdk/overview
 */
export async function register(): Promise<void> {
  // SIN-308: Der Hook wirft nie. Ein Konfigurationsfehler schaltet nur die jeweilige Funktion ab.
  try {
    const { checkEnvUrls } = await import("@/lib/env");
    checkEnvUrls();
  } catch (err) {
    console.warn("[instrumentation] Env-Prüfung fehlgeschlagen", err);
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      await import("./sentry.server.config");
    } catch (err) {
      console.warn("[instrumentation] Sentry abgeschaltet", err);
    }
    try {
      const { ensureLangfuseOtel } = await import("@/lib/quality/langfuse-otel");
      ensureLangfuseOtel();
    } catch (err) {
      console.warn("[instrumentation] Langfuse abgeschaltet", err);
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    try {
      await import("./sentry.edge.config");
    } catch (err) {
      console.warn("[instrumentation] Sentry (edge) abgeschaltet", err);
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
