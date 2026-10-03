/**
 * Next.js instrumentation hook — registers Langfuse OTEL span processor on the server.
 * Docs: https://langfuse.com/docs/observability/sdk/overview (JS/TS setup)
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { ensureLangfuseOtel } = await import("@/lib/quality/langfuse-otel");
  ensureLangfuseOtel();
}
