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
 * Pro Lauf entsteht genau ein Linear-Issue `Trend-Radar KW <JJJJ-KW>` (Label `research`, nie `claude`) mit allen
 * Funden als Checkliste (Linear Free hat eine Issue-Grenze). Gibt es das Issue schon (offen oder gerade erledigt),
 * wird nichts angelegt. Nichts wird automatisch eingebaut.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createLinearIssues, doneTitlesSince, fetchProjectIssues } from "./linear.mjs";

export const MAX_TOP = 5;
export const MAX_SINAN = 3;
export const RADAR_PREFIX = "Trend-Radar KW ";

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

/** Issue-Titel der Woche, z. B. `Trend-Radar KW 2026-41`. */
export const radarTitle = (week) => `${RADAR_PREFIX}${week.replace("-KW", "-")}`;

const label = (v, max) => text(v, max).replace(/[[\]\n\r]/g, " ");

/**
 * Prüft radar.json und baut das eine Wochen-Issue mit Checkliste. Ohne https-Link kein Eintrag.
 * @param {{ top?: any[], sinan?: any[] }} radar
 * @param {string} week
 * @param {Set<string>} [existing] kleingeschriebene Titel offener oder gerade erledigter Issues
 * @returns {{ title: string, description: string, priority: number, labels: string[] }[]} leer oder genau ein Eintrag
 */
export function buildRadarIssues(radar, week, existing = new Set()) {
  const title = radarTitle(week);
  if (existing.has(title.trim().toLowerCase())) return [];
  const top = (radar.top ?? []).filter((t) => label(t.titel, 90) && isHttps(t.link)).slice(0, MAX_TOP);
  const sinan = (radar.sinan ?? []).filter((s) => label(s.titel, 90) && isHttps(s.link)).slice(0, MAX_SINAN);
  const lines = [
    `Funde aus dem Trend-Radar ${week} (Bericht: docs/research/trend-radar-${week}.md). Sinan entscheidet; nichts wird automatisch eingebaut, kein Label \`claude\`.`,
    "",
    "## Funde",
    ...(top.length ? [] : ["Keine belegten Funde in dieser Woche."]),
    ...top.map(
      (t) =>
        `- [ ] [${label(t.titel, 90)}](${t.link}): ${label(t.was, 300)} Warum: ${label(t.warum, 300)} (Lizenz: ${label(t.lizenz, 80) || "nicht geprüft"}, Aufwand: ${label(t.aufwand, 120) || "offen"}, Risiko: ${label(t.risiko, 200) || "offen"})`,
    ),
  ];
  if (sinan.length) lines.push("", "## Klick-Aufgaben", ...sinan.map((s) => `- [ ] [${label(s.titel, 90)}](${s.link}): ${label(s.was, 300)}`));
  return [{ title, description: lines.join("\n"), priority: 4, labels: ["research"] }];
}

async function main(argv) {
  if (argv.includes("--week")) return console.log(reportPath(new Date()));
  const i = argv.indexOf("--create");
  if (i < 0) throw new Error("Aufruf: --week | --create radar.json [--dry-run]");
  const radar = JSON.parse(readFileSync(argv[i + 1], "utf8"));
  const existing = new Set();
  if (process.env.LINEAR_API_KEY) {
    for (const issue of await fetchProjectIssues()) if (!["completed", "canceled"].includes(issue.state.type)) existing.add(issue.title.trim().toLowerCase());
    for (const t of await doneTitlesSince(RADAR_PREFIX)) existing.add(t.trim().toLowerCase());
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
