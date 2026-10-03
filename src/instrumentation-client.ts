import * as Sentry from "@sentry/nextjs";

/**
 * Browser Sentry init (Next.js instrumentation-client).
 * No-op when NEXT_PUBLIC_SENTRY_DSN is missing.
 * EU projects use ingest.de.sentry.io in the DSN host.
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
