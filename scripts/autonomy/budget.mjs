/**
 * Budget des Dispatchers (SIN-223): Pause bis zum Claude-Reset; Cursor-Wartezeit nur noch auf Wunsch (SIN-420).
 * Reine Funktionen ohne Netz. Die Pause steht in der Repo-Variable AGENT_PAUSED_UNTIL (ISO-Zeit oder Epoch-Sekunden).
 */

export const FALLBACK_PAUSE_MS = 5 * 60 * 60 * 1000;
/**
 * So lange hat Cursor Vorrang, bevor Claude ein unberührtes Todo-Issue übernimmt.
 * Seit 09.10.2026 gibt es nur das Claude-Kontingent (SIN-420): Standard 0. Wer Cursor wieder nutzt,
 * setzt CURSOR_GRACE_MIN (Minuten) in der Umgebung des Dispatchers.
 */
/** @param {Record<string, string | undefined>} [env] */
export function cursorGraceMs(env = process.env) {
  const min = Number(env.CURSOR_GRACE_MIN ?? 0);
  return Number.isFinite(min) && min > 0 ? min * 60 * 1000 : 0;
}
export const CURSOR_GRACE_MS = cursorGraceMs();
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

/** Echte Usage-/Rate-Limit-Meldung (nicht: max-turns, Build-Fehler, das Wort „limit“ irgendwo im Log). */
const REAL_LIMIT = /usage limit reached|hit your (?:usage )?limit|limit reached|rate[_ -]?limit|"status":\s*429|too many requests/i;

/**
 * Text, der über ein Limit entscheidet. Die Execution-Datei der Action ist ein JSON-Array der ganzen
 * Sitzung; nur der letzte `result`-Eintrag zählt (Tool-Ausgaben nennen „limit“ oft nebenbei).
 * Erfolg und `error_max_turns` ergeben "" (kein Limit). Kein JSON: der Text selbst.
 */
function limitText(raw) {
  const s = String(raw ?? "");
  let parsed;
  try {
    parsed = JSON.parse(s);
  } catch {
    return s;
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const result = entries.filter((e) => e?.type === "result").pop();
  if (!result) return "";
  if (result.subtype === "error_max_turns" || result.is_error === false) return "";
  return typeof result.result === "string" ? result.result : JSON.stringify(result);
}

/**
 * Reset-Zeit aus der Limit-Meldung von Claude lesen (SIN-227: nur bei echtem Limit).
 * Formate: "usage limit reached|1760000000" (Epoch) oder "resets 3pm (UTC)" / "resets 15:30".
 * Unbekanntes Format: jetzt + FALLBACK_PAUSE_MS. Gibt eine ISO-Zeit zurück, oder null ohne Limit-Hinweis
 * (auch bei max-turns und anderen Fehlern).
 */
export function pauseUntilFromLog(raw, now = new Date()) {
  const s = limitText(raw);
  if (!REAL_LIMIT.test(s)) return null;
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
 * Claude übernimmt ein Issue, wenn es das Label `claude` trägt oder seit CURSOR_GRACE_MS (Standard 0)
 * unverändert in Todo liegt und kein offener PR die ID nennt.
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
