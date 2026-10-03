"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * PostHog EU provider. Initializes only when NEXT_PUBLIC_POSTHOG_KEY is set.
 * Default host: https://eu.i.posthog.com (override via NEXT_PUBLIC_POSTHOG_HOST).
 * @see https://posthog.com/docs/libraries/next-js
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    if (!key) return;
    if (posthog.__loaded) return;

    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
      "https://eu.i.posthog.com";

    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
