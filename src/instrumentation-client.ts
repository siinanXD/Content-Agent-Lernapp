import { loadOnboarding } from "@/lib/learner/onboarding";
import { SENTRY_PRIVACY_OPTIONS, scrubEvent, shouldSendClientEvent } from "@/lib/sentry-privacy";

/**
 * Browser Sentry init (Next.js instrumentation-client).
 * No-op when NEXT_PUBLIC_SENTRY_DSN is missing.
 * EU projects use ingest.de.sentry.io in the DSN host.
 * Das SDK wird nur mit DSN nachgeladen (SIN-286, Lighthouse): sonst liegt es in jedem Bundle.
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

const sentry = dsn
  ? import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn,
        ...SENTRY_PRIVACY_OPTIONS,
        // Nur mit Einwilligung (Onboarding 00b), ohne Personendaten (SIN-259); überschreibt beforeSend.
        beforeSend: (event) => (shouldSendClientEvent(loadOnboarding().consent) ? scrubEvent(event) : null),
        tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
      });
      return Sentry;
    })
  : null;

export const onRouterTransitionStart = (...args: [href: string, navigationType: "push" | "replace" | "traverse"]) => {
  void sentry?.then((Sentry) => Sentry.captureRouterTransitionStart(...args));
};
