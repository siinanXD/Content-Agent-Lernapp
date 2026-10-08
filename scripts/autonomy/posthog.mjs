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
// Je Ereignis zählen wir Besucher (distinct_id), nicht Ereignisse: onboarding_step kann mehrfach feuern.
const QUERY = `select event, count(distinct distinct_id) from events where timestamp > now() - interval 7 day and event in (${EVENTS.map((e) => `'${e}'`).join(",")}) group by event`;

// Schritte des Lernwegs: Name, Start-, Ende-, Abbruch-Ereignis (null: Start minus Ende). Quote = 1 - Ende/Start.
export const SCHRITTE = [
  ["Onboarding", "onboarding_step", "onboarding_completed", null],
  ["Einheit", "unit_started", "unit_completed", "unit_abandoned"],
  ["Wiederholung", "review_started", "review_completed", "review_abandoned"],
];

const UNIT_QUERY =
  "select properties.unitId, count(distinct distinct_id) as n from events where timestamp > now() - interval 7 day and event = 'unit_abandoned' and properties.unitId is not null group by properties.unitId order by n desc limit 3";
// Irgendein Ereignis (auch $pageview): unterscheidet „PostHog sendet nichts“ von „Lernweg nicht genutzt“.
const ANY_QUERY = "select count() from events where timestamp > now() - interval 7 day";

/** Grund für leere Lernweg-Daten; `anyEvents` = Anzahl aller Ereignisse in 7 Tagen oder null (unbekannt). */
export function leerGrund(anyEvents) {
  if (anyEvents > 0) {
    return "keine Lernweg-Ereignisse in 7 Tagen, aber andere Ereignisse da (Ursache: keine Nutzung des Lernwegs)";
  }
  if (anyEvents === 0) {
    return "keine Ereignisse in 7 Tagen (Ursache: kein NEXT_PUBLIC_POSTHOG_KEY im Build oder keine Einwilligung erteilt; beides sendet nichts)";
  }
  return "keine Ereignisse in 7 Tagen (Ursache: kein NEXT_PUBLIC_POSTHOG_KEY im Build, keine Einwilligung oder keine Nutzung)";
}

/**
 * Abbrüche je Schritt aus [[event, anzahl], …]. Ohne Daten ein klarer Grund, sonst Quote je Schritt
 * und die häufigsten Abbruchstellen (höchstens 3, nur Besucherzahlen).
 * `units` = [[unitId, anzahl], …] der meistverlassenen Einheiten (Inhaltskennungen, keine Personen).
 */
export function abbruchJeSchritt(results, { anyEvents = null, units = [] } = {}) {
  const counts = Object.fromEntries((results ?? []).map(([e, n]) => [e, Number(n) || 0]));
  const teile = [];
  const stellen = [];
  for (const [name, von, zu, abgebrochen] of SCHRITTE) {
    if (!counts[von]) continue;
    const ende = counts[zu] ?? 0;
    const quote = Math.max(0, Math.round((1 - ende / counts[von]) * 100));
    teile.push(`${name} ${quote} % (${ende} von ${counts[von]} beendet)`);
    const weg = abgebrochen ? (counts[abgebrochen] ?? 0) : Math.max(0, counts[von] - ende);
    if (weg > 0) stellen.push([name, weg]);
  }
  if (!teile.length) return leerGrund(anyEvents);
  let text = `Abbruch je Schritt: ${teile.join("; ")}`;
  const top = stellen.sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length) text += `; häufigste Abbruchstellen: ${top.map(([n, c], i) => `${i + 1}. ${n} (${c})`).join(", ")}`;
  const einheiten = units.filter(([id, n]) => id && Number(n) > 0).slice(0, 3);
  if (einheiten.length) text += `; meistverlassene Einheiten: ${einheiten.map(([id, n]) => `${id} (${n})`).join(", ")}`;
  return text;
}

async function query(env, base, hogql, fetchImpl, http) {
  const data = await fetchJson("PostHog", `${base}/api/projects/${encodeURIComponent(env.POSTHOG_PROJECT_ID)}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
  }, { fetchImpl, ...http });
  return data.results ?? [];
}

export async function collectPostHogMetrics(env = process.env, fetchImpl = fetch, http = {}) {
  const missing = ["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"].filter((k) => !env[k]);
  if (missing.length) return { posthog: `${NA} (Secret fehlt im Workflow: ${missing.join(", ")})` };
  const base = env.POSTHOG_API_BASE_URL || "https://eu.posthog.com";
  try {
    const results = await query(env, base, QUERY, fetchImpl, http);
    // Die Zusatzabfragen sind optional: ihr Fehler verdeckt die Hauptzahlen nicht.
    let anyEvents = null;
    let units = [];
    if (!results.length) {
      anyEvents = await query(env, base, ANY_QUERY, fetchImpl, http).then((r) => Number(r[0]?.[0]) || 0).catch(() => null);
    } else if (results.some(([e]) => e === "unit_abandoned")) {
      units = await query(env, base, UNIT_QUERY, fetchImpl, http).catch(() => []);
    }
    return { posthog: abbruchJeSchritt(results, { anyEvents, units }) };
  } catch (e) {
    return { posthog: `nicht messbar (${e.message})` };
  }
}
