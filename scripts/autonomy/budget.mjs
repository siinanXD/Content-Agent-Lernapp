/**
 * Budget-Regeln für den Dispatcher (SIN-223, Abschnitt 3b): Claude-Pause, Cursor zuerst,
 * Free-Tier-Warnung bei 80 %, Doku-only-Erkennung. Alles reine Funktionen.
 */

export const WARN_RATIO = 0.8;
/** Annahme (D-39): Claude-Limits setzen sich nach 5 h zurück, wenn der Reset-Zeitpunkt unbekannt ist. */
export const DEFAULT_PAUSE_HOURS = 5;
/** Cursor bekommt einen Dispatcher-Lauf (30 Min) Vorsprung, bevor Claude ein Todo übernimmt. */
export const CURSOR_GRACE_MINUTES = 30;

/** AGENT_PAUSED_UNTIL (ISO-Zeitpunkt, Repo-Variable). Leer oder ungültig = keine Pause. */
export function pausedUntil(value) {
  if (!value || !String(value).trim()) return null;
  const t = Date.parse(String(value).trim());
  return Number.isNaN(t) ? null : new Date(t);
}

export function isPaused(value, now = new Date()) {
  const until = pausedUntil(value);
  return until !== null && until.getTime() > now.getTime();
}

/** Neuer Pause-Zeitpunkt nach einem Claude-Limit: bekannter Reset, sonst jetzt + 5 h. */
export function nextPauseUntil(resetAt, now = new Date()) {
  const known = pausedUntil(resetAt);
  if (known && known.getTime() > now.getTime()) return known;
  return new Date(now.getTime() + DEFAULT_PAUSE_HOURS * 3_600_000);
}

/** Cursor zuerst: Claude übernimmt ein Todo erst, wenn es länger als die Frist unberührt blieb. */
export function cursorHadItsChance(issue, now = new Date(), graceMinutes = CURSOR_GRACE_MINUTES) {
  if (!issue.updatedAt) return true;
  return now.getTime() - Date.parse(issue.updatedAt) >= graceMinutes * 60_000;
}

/** Nur Doku: alles unter docs/, Markdown-Dateien und .github/ (kein Vercel-Deploy nötig). */
export function isDocsOnly(files) {
  return files.length > 0 && files.every((f) => /^docs\//.test(f) || /\.md$/i.test(f) || /^\.github\//.test(f));
}

/**
 * @param {{ name: string, limit: number, unit?: string }[]} limits
 * @param {Record<string, number>} usage  Verbrauch je Name
 * @returns {{ name: string, used: number, limit: number, ratio: number, unit?: string }[]} ab 80 %
 */
export function usageAlerts(limits, usage) {
  return limits
    .filter((l) => typeof usage[l.name] === "number" && l.limit > 0)
    .map((l) => ({ ...l, used: usage[l.name], ratio: usage[l.name] / l.limit }))
    .filter((a) => a.ratio >= WARN_RATIO)
    .map(({ name, used, limit, ratio, unit }) => ({ name, used, limit, ratio, unit }));
}
