#!/usr/bin/env node
/**
 * Trend-Radar (SIN-313): wöchentliche Recherche. Dieses Skript macht nur die Mechanik, die Suche macht Claude
 * im Workflow `trend-radar.yml`.
 *
 *   node scripts/autonomy/trend-radar.mjs --week                          # Berichtspfad dieser Woche
 *   node scripts/autonomy/trend-radar.mjs --create radar.json [--dry-run]
 *
 * `radar.json`: { "top": [{ titel, was, warum, lizenz, aufwand, risiko, link }] (höchstens 5),
 *                "sinan": [{ titel, was, link }] (Klick-Aufgaben, höchstens 3) }.
 * Top-5 werden Linear-Issues mit Label `research` (nie `claude`), Klick-Aufgaben Label `sinan`. Offene oder
 * gerade erledigte Issues mit gleichem Titel werden nicht doppelt angelegt. Nichts wird automatisch eingebaut.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createLinearIssues, doneTitlesSince, fetchProjectIssues } from "./linear.mjs";

export const MAX_TOP = 5;
export const MAX_SINAN = 3;
export const RESEARCH_PREFIX = "Research: ";
export const SINAN_PREFIX = "Sinan: ";

/** ISO-Kalenderwoche, z. B. `2026-KW41`. */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-KW${String(week).padStart(2, "0")}`;
}

export const reportPath = (date) => `docs/research/trend-radar-${isoWeek(date)}.md`;

/** Jüngster Bericht aus einer Dateiliste (die Namen sortieren wie die Kalenderwochen). */
export function latestReport(files) {
  return files.filter((f) => /(^|\/)trend-radar-\d{4}-KW\d{2}\.md$/.test(f)).sort().at(-1) ?? null;
}

const text = (v, max) => String(v ?? "").trim().slice(0, max);
const isHttps = (u) => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Prüft radar.json und baut die Issue-Einträge. Ohne https-Link kein Eintrag.
 * @param {{ top?: any[], sinan?: any[] }} radar
 * @param {string} week
 * @param {Set<string>} [existing] kleingeschriebene Titel offener oder gerade erledigter Issues
 */
export function buildRadarIssues(radar, week, existing = new Set()) {
  const seen = new Set(existing);
  const out = [];
  const add = (prefix, titel, description, priority, labels) => {
    const title = `${prefix}${titel}`;
    if (!titel || seen.has(title.toLowerCase())) return;
    seen.add(title.toLowerCase());
    out.push({ title, description, priority, labels });
  };
  for (const t of (radar.top ?? []).slice(0, MAX_TOP)) {
    if (!isHttps(t.link)) continue;
    const desc = [
      `Vorschlag aus dem Trend-Radar ${week} (Bericht: docs/research/trend-radar-${week}.md). Sinan entscheidet; nichts wird automatisch eingebaut, kein Label \`claude\`.`,
      "",
      `- Was: ${text(t.was, 400)}`,
      `- Warum relevant: ${text(t.warum, 400)}`,
      `- Lizenz: ${text(t.lizenz, 80) || "nicht geprüft"}`,
      `- Aufwand: ${text(t.aufwand, 120) || "offen"}`,
      `- Risiko: ${text(t.risiko, 200) || "offen"}`,
      `- Link: ${t.link}`,
    ].join("\n");
    add(RESEARCH_PREFIX, text(t.titel, 90), desc, 4, ["research"]);
  }
  for (const s of (radar.sinan ?? []).slice(0, MAX_SINAN)) {
    if (!isHttps(s.link)) continue;
    add(SINAN_PREFIX, text(s.titel, 90), `Aus dem Trend-Radar ${week}. Klick-Aufgabe für Sinan (SIN-310).\n\n- Was: ${text(s.was, 400)}\n- Link: ${s.link}`, 3, ["sinan"]);
  }
  return out;
}

async function main(argv) {
  if (argv.includes("--week")) return console.log(reportPath(new Date()));
  const i = argv.indexOf("--create");
  if (i < 0) throw new Error("Aufruf: --week | --create radar.json [--dry-run]");
  const radar = JSON.parse(readFileSync(argv[i + 1], "utf8"));
  const existing = new Set();
  if (process.env.LINEAR_API_KEY) {
    for (const issue of await fetchProjectIssues()) if (!["completed", "canceled"].includes(issue.state.type)) existing.add(issue.title.toLowerCase());
    for (const prefix of [RESEARCH_PREFIX, SINAN_PREFIX]) for (const t of await doneTitlesSince(prefix)) existing.add(t.toLowerCase());
  }
  const items = buildRadarIssues(radar, isoWeek(new Date()), existing);
  const dry = argv.includes("--dry-run");
  for (const it of items) console.log(`${dry ? "Würde anlegen" : "Anlegen"}: [${it.labels}] ${it.title}`);
  if (!dry) await createLinearIssues(items);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
