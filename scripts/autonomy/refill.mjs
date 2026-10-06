/**
 * Planer-Nachfüllen (SIN-253): fällt die Zahl startbarer Todo-Issues unter 5, stößt der Wächter (status.mjs)
 * den Planer an, statt bis Sonntag zu warten. Reine Funktionen, kein Netz.
 */
export const REFILL_MIN = 6;
export const REFILL_MAX = 10;
/** Höchstens ein Anstoß in diesem Abstand (Merker `lastRefill` im Status-Issue). */
export const REFILL_COOLDOWN_H = 2;
const HOUR_MS = 3600 * 1000;

const positive = (v, fallback) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Werte der Bauphase (SIN-262); die Repo-Variablen REFILL_MIN, REFILL_MAX, REFILL_COOLDOWN_H überschreiben sie. */
/** @param {Record<string, string | undefined>} [env] */
export function refillConfig(env = process.env) {
  const min = Math.floor(positive(env.REFILL_MIN, REFILL_MIN));
  const max = Math.max(min, Math.floor(positive(env.REFILL_MAX, REFILL_MAX)));
  return { min, max, cooldownH: positive(env.REFILL_COOLDOWN_H, REFILL_COOLDOWN_H) };
}

/** Frühester nächster Anstoß (Date) oder null, wenn es keinen Merker gibt. */
export function nextRefillAt(lastRefill, cooldownH = REFILL_COOLDOWN_H) {
  const last = lastRefill ? new Date(lastRefill).getTime() : NaN;
  return Number.isFinite(last) ? new Date(last + cooldownH * HOUR_MS) : null;
}

/**
 * „Nur Bugs“ gilt ausschließlich für das Claude-Kontingent (Limit-Pause, siehe `paused` in decideRefill) und den
 * API-Kostendeckel (SIN-266). Vercel, Sentry, PostHog, Langfuse und Supabase bremsen die Planung nie.
 */
export const BUGS_ONLY_QUOTAS = ["api_kosten_eur", "claude_max"];

/** Kontingent-Zeilen (buildQuotaRows) ab Warnschwelle, die nur Bugs erlauben. */
export const overQuota = (quotaRows = []) => quotaRows.some((r) => r.over && BUGS_ONLY_QUOTAS.includes(r.key));

/**
 * Entscheidet, ob der Planer jetzt angestoßen wird.
 * @param {{ startable: number, phase: string, lastRefill?: string|null, quotaOver?: boolean, paused?: boolean, linearFull?: boolean, now?: Date, env?: Record<string, string | undefined> }} input
 * @returns {{ trigger: boolean, reason: string, maxIssues: number, bugsOnly: boolean }}
 */
export function decideRefill({ startable, phase, lastRefill = null, quotaOver = false, paused = false, linearFull = false, now = new Date(), env = process.env }) {
  const no = (reason) => ({ trigger: false, reason, maxIssues: 0, bugsOnly: false });
  if (linearFull) return no("Linear-Kontingent ab 95 %: der Planer legt keine neuen Issues an (SIN-291)");
  if (phase === "betrieb") return no("Phase Betrieb: Planung nach dem Beobachtungsfenster");
  const { min, max, cooldownH } = refillConfig(env);
  if (startable >= min) return no(`${startable} startbar, genug`);
  if (paused) return no("Pause aktiv");
  const last = lastRefill ? new Date(lastRefill).getTime() : NaN;
  if (Number.isFinite(last) && now.getTime() - last < cooldownH * HOUR_MS) return no(`letzter Anstoß vor weniger als ${cooldownH} h`);
  return { trigger: true, reason: `nur ${startable} startbar`, maxIssues: max - startable, bugsOnly: quotaOver };
}
