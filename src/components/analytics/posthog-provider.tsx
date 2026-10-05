"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { loadOnboarding } from "@/lib/learner/onboarding";

/**
 * PostHog EU provider. Initializes only when NEXT_PUBLIC_POSTHOG_KEY is set
 * and the learner consented (Onboarding 00b, SIN-230).
 * Default host: https://eu.i.posthog.com (override via NEXT_PUBLIC_POSTHOG_HOST).
 * @see https://posthog.com/docs/libraries/next-js
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    if (!key) return;

    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
      "https://eu.i.posthog.com";

    // Widerruf in den Einstellungen stoppt die Erfassung sofort.
    function sync() {
      if (loadOnboarding().consent === true) {
        if (!posthog.__loaded) {
          posthog.init(key!, {
            api_host: host,
            person_profiles: "identified_only",
            capture_pageview: true,
            capture_pageleave: true,
          });
        } else {
          posthog.opt_in_capturing();
        }
      } else if (posthog.__loaded) {
        posthog.opt_out_capturing();
      }
    }
    sync();
    window.addEventListener("cal-consent-change", sync);
    return () => window.removeEventListener("cal-consent-change", sync);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
