import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

/** Build-Kennung für den Service-Worker-Cache (SIN-250). */
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? `local-${Date.now()}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
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
  // Release = Commit; Quellkarten und Fehler tragen dasselbe Tag (SIN-273).
  release: { name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA },
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  widenClientFileUpload: Boolean(process.env.SENTRY_AUTH_TOKEN),
  tunnelRoute: "/sentry-tunnel",
});
