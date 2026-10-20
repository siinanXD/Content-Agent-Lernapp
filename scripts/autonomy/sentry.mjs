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

const MAX_LISTED = 3;
const MAX_TITLE = 100;

/** Titel ohne Personendaten (E-Mail, IP) und auf eine Zeile gekürzt (SIN-535). */
export function safeTitle(title) {
  const t = String(title ?? "")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[e-mail]")
    .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "[ip]")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > MAX_TITLE ? `${t.slice(0, MAX_TITLE - 1)}…` : t;
}

/** Link ohne Query/Fragment, nur http(s). */
function safeLink(link) {
  try {
    const u = new URL(link);
    return /^https?:$/.test(u.protocol) ? `${u.origin}${u.pathname}` : "";
  } catch {
    return "";
  }
}

/** „Titel (12×, Link)“ je Fehler; Einträge ohne Titel entfallen. */
export function describeIssues(items) {
  return items
    .filter((i) => i && i.title)
    .slice(0, MAX_LISTED)
    .map((i) => {
      const parts = [i.count != null ? `${i.count}×` : "", safeLink(i.permalink)].filter(Boolean);
      return `„${safeTitle(i.title)}“${parts.length ? ` (${parts.join(", ")})` : ""}`;
    });
}

/** Zählt Issues über alle Seiten (Link-Header, `results="true"`). */
async function countIssues(env, query, fetchImpl, http, listed) {
  const base = env.SENTRY_BASE_URL || "https://de.sentry.io";
  // `lastSeen:-7d` filtert verbindlich; `statsPeriod` allein steuert nur die Statistik.
  // Erlaubte stats_period-Werte: '' (Standard), '24h', '14d'. 7d ist nicht erlaubt.
  const params = new URLSearchParams({ query: `${query} lastSeen:-7d`, statsPeriod: "24h", limit: "100" });
  let url = `${base}/api/0/projects/${encodeURIComponent(env.SENTRY_ORG)}/${encodeURIComponent(env.SENTRY_PROJECT)}/issues/?${params}`;
  let total = 0;
  for (let page = 0; page < MAX_PAGES && url; page++) {
    const { data, res } = await fetchJsonFull("Sentry", url, { headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` } }, { fetchImpl, ...http });
    total += data.length;
    if (listed) listed.push(...data);
    const next = /<([^>]+)>;\s*rel="next";\s*results="true"/.exec(res.headers?.get?.("link") ?? "");
    url = next ? next[1] : null;
  }
  return total;
}

export async function collectSentryMetrics(env = process.env, fetchImpl = fetch, http = {}) {
  const out = { sentry: NA, sentry_kritisch: NA };
  const missing = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"].filter((k) => !env[k]);
  if (missing.length) {
    const msg = `${NA} (Secret fehlt im Workflow: ${missing.join(", ")})`;
    return { sentry: msg, sentry_kritisch: msg };
  }
  try {
    const items = [];
    const n = await countIssues(env, "is:unresolved", fetchImpl, http, items);
    const details = describeIssues(items);
    out.sentry = `${n} ungelöste Fehler (7 Tage)${details.length ? `: ${details.join("; ")}` : ""}`;
  } catch (e) {
    out.sentry = NOT_MEASURABLE(e);
  }
  try {
    out.sentry_kritisch = await countIssues(env, "is:unresolved level:[error,fatal]", fetchImpl, http);
  } catch (e) {
    out.sentry_kritisch = NOT_MEASURABLE(e);
  }
  return out;
}
