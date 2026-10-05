/**
 * Budget des Dispatchers (SIN-223): Pause bis zum Claude-Reset und Cursor-zuerst.
 * Reine Funktionen ohne Netz. Die Pause steht in der Repo-Variable AGENT_PAUSED_UNTIL (ISO-Zeit oder Epoch-Sekunden).
 */

export const FALLBACK_PAUSE_MS = 5 * 60 * 60 * 1000;
/** So lange hat Cursor Vorrang, bevor Claude ein unberührtes Todo-Issue übernimmt. */
export const CURSOR_GRACE_MS = 60 * 60 * 1000;
export const CLAUDE_LABEL = "claude";

/** Pausen-Zeitpunkt als Date, oder null bei leer/ungültig. */
export function parsePausedUntil(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const d = /^\d{9,13}$/.test(v) ? new Date(v.length > 10 ? Number(v) : Number(v) * 1000) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPaused(value, now = new Date()) {
  const until = parsePausedUntil(value);
  return Boolean(until && until.getTime() > now.getTime());
}

/**
 * Reset-Zeit aus der Limit-Meldung von Claude lesen.
 * Formate: "usage limit reached|1760000000" (Epoch) oder "resets 3pm (UTC)" / "resets 15:30".
 * Unbekanntes Format: jetzt + FALLBACK_PAUSE_MS. Gibt eine ISO-Zeit zurück, oder null ohne Limit-Hinweis.
 */
export function pauseUntilFromLog(text, now = new Date()) {
  const s = String(text ?? "");
  if (!/limit/i.test(s)) return null;
  const epoch = s.match(/limit reached\|(\d{10})/i);
  if (epoch) return new Date(Number(epoch[1]) * 1000).toISOString();
  const clock = s.match(/resets?\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (clock) {
    let h = Number(clock[1]);
    const m = Number(clock[2] ?? 0);
    const mer = clock[3]?.toLowerCase();
    if (mer === "pm" && h < 12) h += 12;
    if (mer === "am" && h === 12) h = 0;
    if (h < 24 && m < 60) {
      const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m));
      if (t.getTime() <= now.getTime()) t.setUTCDate(t.getUTCDate() + 1);
      return t.toISOString();
    }
  }
  return new Date(now.getTime() + FALLBACK_PAUSE_MS).toISOString();
}

/**
 * Cursor zuerst: Claude übernimmt ein Issue nur, wenn es das Label `claude` trägt oder
 * seit CURSOR_GRACE_MS unverändert in Todo liegt und kein offener PR die ID nennt.
 * `openPrs`: [{ title, head }]. Ohne `updatedAt` (Fixture) zählt das Issue als wartend.
 */
/** @param {{ identifier: string, updatedAt?: string, labels?: { nodes: { name: string }[] } }} issue
 *  @param {{ now?: Date, openPrs?: { title?: string, head?: string }[], graceMs?: number }} [opts] */
export function claudeMayTake(issue, { now = new Date(), openPrs = [], graceMs = CURSOR_GRACE_MS } = {}) {
  const id = new RegExp(`(^|[^a-z0-9])${String(issue.identifier).toLowerCase()}($|[^0-9])`);
  if (openPrs.some((p) => id.test(`${p.title ?? ""} ${p.head ?? ""}`.toLowerCase()))) return false;
  if ((issue.labels?.nodes ?? []).some((l) => l.name === CLAUDE_LABEL)) return true;
  if (!issue.updatedAt) return true;
  return now.getTime() - new Date(issue.updatedAt).getTime() >= graceMs;
}
