"use client";

import { useEffect } from "react";
import { syncPostHogConsent } from "@/lib/analytics-consent";
import { loadOnboarding } from "@/lib/learner/onboarding";

/**
 * PostHog EU provider. Initializes only when NEXT_PUBLIC_POSTHOG_KEY is set
 * and the learner consented (Onboarding 00b, SIN-230).
 * Default host: https://eu.i.posthog.com (override via NEXT_PUBLIC_POSTHOG_HOST).
 * posthog-js wird erst bei gesetztem Key nachgeladen (SIN-286, Lighthouse): sonst liegt es
 * in jedem Bundle. Niemand nutzt den React-Kontext, darum kein PHProvider.
 * @see https://posthog.com/docs/libraries/next-js
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    if (!key) return;

    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
      "https://eu.i.posthog.com";

    let removed = false;
    let sync = () => {};
    // Widerruf in den Einstellungen stoppt die Erfassung sofort.
    void import("posthog-js").then(({ default: posthog }) => {
      if (removed) return;
      sync = () => syncPostHogConsent(posthog, loadOnboarding().consent, { key, host });
      sync();
    });
    const onChange = () => sync();
    window.addEventListener("cal-consent-change", onChange);
    return () => {
      removed = true;
      window.removeEventListener("cal-consent-change", onChange);
    };
  }, []);

  return children;
}
