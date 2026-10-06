/**
 * Sentry-Kennzahlen für Planer und Produktreife (SIN-259).
 * Ohne SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT: „nicht verfügbar“.
 * EU-Region: https://de.sentry.io (überschreibbar mit SENTRY_BASE_URL).
 * @see https://docs.sentry.io/api/events/list-a-projects-issues/
 */
import { fetchJsonFull } from "./http.mjs";

const NA = "nicht verfügbar";
const NOT_MEASURABLE = (e) => `nicht messbar (${e.message})`;
const MAX_PAGES = 10;

/** Zählt Issues über alle Seiten (Link-Header, `results="true"`). */
async function countIssues(env, query, fetchImpl, http) {
  const base = env.SENTRY_BASE_URL || "https://de.sentry.io";
  // `lastSeen:-7d` filtert verbindlich; `statsPeriod` allein steuert nur die Statistik.
  const params = new URLSearchParams({ query: `${query} lastSeen:-7d`, statsPeriod: "7d", limit: "100" });
  let url = `${base}/api/0/projects/${encodeURIComponent(env.SENTRY_ORG)}/${encodeURIComponent(env.SENTRY_PROJECT)}/issues/?${params}`;
  let total = 0;
  for (let page = 0; page < MAX_PAGES && url; page++) {
    const { data, res } = await fetchJsonFull("Sentry", url, { headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` } }, { fetchImpl, ...http });
    total += data.length;
    const next = /<([^>]+)>;\s*rel="next";\s*results="true"/.exec(res.headers?.get?.("link") ?? "");
    url = next ? next[1] : null;
  }
  return total;
}

export async function collectSentryMetrics(env = process.env, fetchImpl = fetch, http = {}) {
  const out = { sentry: NA, sentry_kritisch: NA };
  if (!env.SENTRY_AUTH_TOKEN || !env.SENTRY_ORG || !env.SENTRY_PROJECT) return out;
  try {
    out.sentry = `${await countIssues(env, "is:unresolved", fetchImpl, http)} ungelöste Fehler (7 Tage)`;
    out.sentry_kritisch = await countIssues(env, "is:unresolved level:[error,fatal]", fetchImpl, http);
  } catch (e) {
    out.sentry = NOT_MEASURABLE(e);
  }
  return out;
}
