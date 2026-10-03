import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * Wrap with Sentry build plugin. Source-map upload runs only when
 * SENTRY_AUTH_TOKEN (+ optional SENTRY_ORG / SENTRY_PROJECT) are set.
 * Missing secrets → build still succeeds (no upload).
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  widenClientFileUpload: Boolean(process.env.SENTRY_AUTH_TOKEN),
  tunnelRoute: "/sentry-tunnel",
});
