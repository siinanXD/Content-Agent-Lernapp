/**
 * Projekt-Phasen (SIN-244): `bauen` (bis die Produktreife grün ist und Sinan abgenommen hat) und `betrieb`
 * (beobachten, dann einmal pro Fenster planen). Gelesen aus den Repo-Variablen PHASE, OBSERVE_DAYS, PHASE_SINCE.
 * Reine Funktionen; nur `lastPlanAt` fragt Linear.
 */
export const PHASES = ["bauen", "betrieb"];
export const DEFAULT_OBSERVE_DAYS = 7;
/** Im Betrieb höchstens so viele Issues je Wochenplan (statt 3 je Spur). */
export const MAX_PLAN_ISSUES_BETRIEB = 5;
/** Label des Wochenplans: der Dispatcher startet im Betrieb auch diese Issues. */
export const PLAN_LABEL = "wochenplan";
/** Im Betrieb startet der Dispatcher nur Issues mit einem dieser Labels. */
export const BETRIEB_LABELS = ["bug", "security", "content", PLAN_LABEL];
/** Darunter zählen nur eindeutige Signale (PRODUCT.md, Lern-Schleife). */
export const MIN_ACTIVE_USERS = 50;
const DAY_MS = 24 * 3600 * 1000;
/** Der Planer läuft sonntags 06:00; ein Fenster von 7 Tagen gilt ab 6 Tagen 12 Stunden als abgelaufen. */
const TOLERANCE_MS = 12 * 3600 * 1000;

export function parsePhase(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return PHASES.includes(v) ? v : "bauen";
}

export function parseObserveDays(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_OBSERVE_DAYS;
}

/** Gültiges Datum oder null. */
function asDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Stand der Phase. `lastPlan` (letzter Wochenplan) hat Vorrang vor `since` (Beginn des Betriebs, Abnahme).
 * Ist kein Beginn bekannt, gilt das Fenster als abgelaufen (einmal planen, das setzt den Rhythmus).
 * @typedef {{ phase: string, observeDays: number, windowStart: Date|null, nextPlanAt: Date|null, daysLeft: number|null, due: boolean }} PhaseState
 * @param {{ phase?: string, observeDays?: string|number, lastPlan?: string|null, since?: string, now?: Date }} [input]
 * @returns {PhaseState}
 */
export function phaseState({ phase, observeDays, lastPlan, since, now = new Date() } = {}) {
  const p = parsePhase(phase);
  const days = parseObserveDays(observeDays);
  if (p === "bauen") return { phase: p, observeDays: days, windowStart: null, nextPlanAt: null, daysLeft: null, due: true };
  const windowStart = asDate(lastPlan) ?? asDate(since);
  if (!windowStart) return { phase: p, observeDays: days, windowStart: null, nextPlanAt: null, daysLeft: null, due: true };
  const nextPlanAt = new Date(windowStart.getTime() + days * DAY_MS);
  const due = now.getTime() >= nextPlanAt.getTime() - TOLERANCE_MS;
  return { phase: p, observeDays: days, windowStart, nextPlanAt, daysLeft: due ? 0 : Math.ceil((nextPlanAt.getTime() - now.getTime()) / DAY_MS), due };
}

/** Liest die Phase aus der Umgebung; `lastPlan` kommt von `lastPlanAt`. */
export function phaseFromEnv(env = process.env, { lastPlan, now } = {}) {
  return phaseState({ phase: env.PHASE, observeDays: env.OBSERVE_DAYS, since: env.PHASE_SINCE, lastPlan, now });
}

/** Dispatcher im Betrieb: nur Fehler, Sicherheit, Content und der letzte Wochenplan. In `bauen` alles. */
export function phaseAllowsIssue(phase, issue) {
  if (parsePhase(phase) === "bauen") return true;
  return (issue.labels?.nodes ?? []).some((l) => BETRIEB_LABELS.includes(l.name.toLowerCase()));
}

/** Zeitpunkt des letzten Wochenplans (neuestes Issue mit Label `wochenplan`, auch erledigte) oder null. */
export async function lastPlanAt(call) {
  const data = await call(
    `query($l: String!) { issues(first: 1, orderBy: createdAt, filter: { labels: { name: { eq: $l } } }) { nodes { createdAt } } }`,
    { l: PLAN_LABEL },
  );
  return data.issues.nodes[0]?.createdAt ?? null;
}

/** Eine Zeile für Status-Seite und Wochenbericht. */
export function renderPhase(state) {
  if (state.phase === "bauen") return "Phase: bauen (bis Produktreife grün und Abnahme durch Sinan).";
  if (!state.windowStart) return "Phase: Betrieb, Beginn unbekannt (PHASE_SINCE fehlt): der nächste Planer-Lauf plant.";
  const next = state.nextPlanAt.toISOString().slice(0, 10);
  return state.due
    ? `Phase: Betrieb, Beobachtungsfenster (${state.observeDays} Tage) abgelaufen: der nächste Planer-Lauf plant.`
    : `Phase: Betrieb, beobachten, noch ${state.daysLeft} Tage bis zur nächsten Planung (${next}, Fenster ${state.observeDays} Tage).`;
}
