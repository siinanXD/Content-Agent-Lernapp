/**
 * PostHog-Kennzahl für den Planer (SIN-273).
 * Ohne POSTHOG_PERSONAL_API_KEY/POSTHOG_PROJECT_ID: „nicht verfügbar“.
 * EU-Region: https://eu.posthog.com (überschreibbar mit POSTHOG_API_BASE_URL).
 * @see https://posthog.com/docs/api/query
 */
import { fetchJson } from "./http.mjs";

const NA = "nicht verfügbar";
const QUERY =
  "select event, count() from events where timestamp > now() - interval 7 day and event in ('unit_started','unit_completed','question_answered') group by event";

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
    return { posthog: JSON.stringify(data.results) };
  } catch (e) {
    return { posthog: `nicht messbar (${e.message})` };
  }
}
