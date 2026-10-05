/**
 * PostHog nur nach Einwilligung (DSGVO, SIN-245).
 * Ohne Zustimmung: kein `init`, also keine Events und keine Cookies.
 * Widerruf: `opt_out_capturing` stoppt sofort.
 */

export type ConsentClient = {
  __loaded?: boolean;
  // Methoden-Syntax (bivariant), damit `posthog-js` direkt zuweisbar ist.
  init(key: string, options: Record<string, unknown>): unknown;
  opt_in_capturing(): void;
  opt_out_capturing(): void;
};

export type ConsentConfig = { key: string; host: string };

/** Gleicht den PostHog-Client mit dem Einwilligungsstand ab. */
export function syncPostHogConsent(
  client: ConsentClient,
  consent: boolean | null,
  config: ConsentConfig,
): void {
  if (consent === true) {
    if (!client.__loaded) {
      client.init(config.key, {
        api_host: config.host,
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
      });
    } else {
      client.opt_in_capturing();
    }
  } else if (client.__loaded) {
    client.opt_out_capturing();
  }
}
