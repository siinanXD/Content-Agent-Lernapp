/**
 * Sentry ohne Personendaten (SIN-259).
 * `scrubEvent` entfernt Nutzer, IP, Cookies, Header, Query-Strings und Bodies.
 * `shouldSendClientEvent` lässt Browser-Fehler nur nach Einwilligung durch (Onboarding 00b).
 */

type SentryLikeEvent = {
  user?: unknown;
  server_name?: string;
  request?: {
    url?: string;
    cookies?: unknown;
    headers?: unknown;
    data?: unknown;
    query_string?: unknown;
    env?: unknown;
  };
};

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0];
}

export function scrubEvent<T extends SentryLikeEvent>(event: T): T {
  delete event.user;
  delete event.server_name;
  if (event.request) {
    const { url } = event.request;
    event.request = url ? { url: stripQuery(url) } : {};
  }
  return event;
}

/** Browser-Fehler nur mit Einwilligung; Widerruf wirkt beim nächsten Fehler sofort. */
export function shouldSendClientEvent(consent: boolean | null): boolean {
  return consent === true;
}

/** Umgebung für Sentry: Vercel setzt `VERCEL_ENV`, lokal `NODE_ENV`. Das Release setzt der Build aus `release.name`. */
export const SENTRY_ENVIRONMENT = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

export const SENTRY_PRIVACY_OPTIONS = {
  sendDefaultPii: false,
  environment: SENTRY_ENVIRONMENT,
  beforeSend: scrubEvent,
} as const;
