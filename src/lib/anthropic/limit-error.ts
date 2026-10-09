/**
 * SIN-450 — Limit-Fehler der Anthropic-API (Ausgabenlimit, leeres Guthaben) von anderen Fehlern unterscheiden.
 * Anthropic antwortet mit HTTP 400 `invalid_request_error`: "You have reached your specified API usage limits.
 * You will regain access on 2026-11-01 at 00:00 UTC." Ein 429 (`rate_limit_error`) ist kurzfristig und kein Limit hier.
 * Ein Limit-Fehler ist kein Qualitätsfehler: der Lauf pausiert, es gibt keine Reparaturschleife.
 */

export const PAUSE_PREFIX = "pausiert: API-Limit";

const LIMIT_PATTERNS = [
  /reached your specified api usage limits/i,
  /api usage limits?/i,
  /credit balance is too low/i,
  /workspace api usage limit/i,
];

function textOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

export function isApiLimitError(error: unknown): boolean {
  const text = textOf(error);
  if (/\brate_limit_error\b/i.test(text) || /\b429\b/.test(text)) return false;
  return LIMIT_PATTERNS.some((p) => p.test(text));
}

/** Datum (YYYY-MM-DD), ab dem die API wieder frei ist, falls die Antwort es nennt. */
export function limitRegainDate(error: unknown): string | null {
  return /regain access on (\d{4}-\d{2}-\d{2})/i.exec(textOf(error))?.[1] ?? null;
}

/** Grund für das Statusprotokoll: „pausiert: API-Limit am 2026-10-09 (frei ab 2026-11-01)“. */
export function pauseReason(error: unknown, now: Date = new Date()): string {
  const since = now.toISOString().slice(0, 10);
  const until = limitRegainDate(error);
  return `${PAUSE_PREFIX} am ${since}${until ? ` (frei ab ${until})` : ""}`;
}
