/**
 * PostHog-Kennzahl für den Planer (SIN-273, SIN-373).
 * Ohne POSTHOG_PERSONAL_API_KEY/POSTHOG_PROJECT_ID: „nicht verfügbar“.
 * Ausgabe: Abbruchquote je Schritt des Lernwegs oder ein klarer Grund für leere Daten.
 * EU-Region: https://eu.posthog.com (überschreibbar mit POSTHOG_API_BASE_URL).
 * Ereignisse: docs/ops/posthog-ereignisse.md
 * @see https://posthog.com/docs/api/query
 */
import { fetchJson } from "./http.mjs";

const NA = "nicht verfügbar";
const EVENTS = [
  "onboarding_step",
  "onboarding_completed",
  "unit_started",
  "unit_completed",
  "unit_abandoned",
  "question_answered",
  "review_started",
  "review_completed",
  "review_abandoned",
];
const QUERY = `select event, count() from events where timestamp > now() - interval 7 day and event in (${EVENTS.map((e) => `'${e}'`).join(",")}) group by event`;

// Schritte des Lernwegs: Name, Start-Ereignis, Ende-Ereignis. Abbruchquote = 1 - Ende/Start.
export const SCHRITTE = [
  ["Onboarding", "onboarding_step", "onboarding_completed"],
  ["Einheit", "unit_started", "unit_completed"],
  ["Wiederholung", "review_started", "review_completed"],
];

/** Abbruchquote je Schritt aus [[event, anzahl], …]; ohne Daten ein klarer Grund. */
export function abbruchJeSchritt(results) {
  const counts = Object.fromEntries((results ?? []).map(([e, n]) => [e, Number(n) || 0]));
  const teile = SCHRITTE.flatMap(([name, von, zu]) => {
    if (!counts[von]) return [];
    const ende = counts[zu] ?? 0;
    const quote = Math.max(0, Math.round((1 - ende / counts[von]) * 100));
    return [`${name} ${quote} % (${ende} von ${counts[von]} beendet)`];
  });
  if (!teile.length) {
    return "keine Ereignisse in 7 Tagen (Ursache: keine Einwilligung erteilt, kein NEXT_PUBLIC_POSTHOG_KEY im Build oder noch keine Nutzung)";
  }
  return `Abbruch je Schritt: ${teile.join("; ")}`;
}

export async function collectPostHogMetrics(env = process.env, fetchImpl = fetch, http = {}) {
  const missing = ["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"].filter((k) => !env[k]);
  if (missing.length) return { posthog: `${NA} (Secret fehlt im Workflow: ${missing.join(", ")})` };
  const base = env.POSTHOG_API_BASE_URL || "https://eu.posthog.com";
  try {
    const data = await fetchJson("PostHog", `${base}/api/projects/${encodeURIComponent(env.POSTHOG_PROJECT_ID)}/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: QUERY } }),
    }, { fetchImpl, ...http });
    return { posthog: abbruchJeSchritt(data.results) };
  } catch (e) {
    return { posthog: `nicht messbar (${e.message})` };
  }
}
