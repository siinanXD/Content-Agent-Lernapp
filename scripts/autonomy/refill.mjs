/**
 * Planer-Nachfüllen (SIN-253): fällt die Zahl startbarer Todo-Issues unter 5, stößt der Wächter (status.mjs)
 * den Planer an, statt bis Sonntag zu warten. Reine Funktionen, kein Netz.
 */
export const REFILL_MIN = 5;
export const REFILL_MAX = 8;
/** Höchstens ein Anstoß in diesem Abstand (Merker `lastRefill` im Status-Issue). */
export const REFILL_COOLDOWN_H = 6;
const HOUR_MS = 3600 * 1000;

/** Kontingent-Zeilen (buildQuotaRows) ab Warnschwelle → nur Bugs. */
export const overQuota = (quotaRows = []) => quotaRows.some((r) => r.over);

/**
 * Entscheidet, ob der Planer jetzt angestoßen wird.
 * @param {{ startable: number, phase: string, lastRefill?: string|null, quotaOver?: boolean, paused?: boolean, now?: Date }} input
 * @returns {{ trigger: boolean, reason: string, maxIssues: number, bugsOnly: boolean }}
 */
export function decideRefill({ startable, phase, lastRefill = null, quotaOver = false, paused = false, now = new Date() }) {
  const no = (reason) => ({ trigger: false, reason, maxIssues: 0, bugsOnly: false });
  if (phase === "betrieb") return no("Phase Betrieb: Planung nach dem Beobachtungsfenster");
  if (startable >= REFILL_MIN) return no(`${startable} startbar, genug`);
  if (paused) return no("Pause aktiv");
  const last = lastRefill ? new Date(lastRefill).getTime() : NaN;
  if (Number.isFinite(last) && now.getTime() - last < REFILL_COOLDOWN_H * HOUR_MS) return no(`letzter Anstoß vor weniger als ${REFILL_COOLDOWN_H} h`);
  return { trigger: true, reason: `nur ${startable} startbar`, maxIssues: REFILL_MAX - startable, bugsOnly: quotaOver };
}
