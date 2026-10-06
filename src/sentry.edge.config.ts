import * as Sentry from "@sentry/nextjs";
import { SENTRY_PRIVACY_OPTIONS } from "@/lib/sentry-privacy";

/**
 * Edge Sentry init. No-op when NEXT_PUBLIC_SENTRY_DSN is missing.
 * EU projects use ingest.de.sentry.io in the DSN host.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    ...SENTRY_PRIVACY_OPTIONS,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  });
}
