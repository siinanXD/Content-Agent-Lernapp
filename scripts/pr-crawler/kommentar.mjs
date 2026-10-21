#!/usr/bin/env node
/**
 * PR-Crawler, Schritt 3 (SIN-906): der Beleg als PR-Kommentar mit Marker `<!-- pr-crawler -->`, bei neuem Lauf aktualisiert.
 *
 *   node scripts/pr-crawler/kommentar.mjs --pr 123 --sha abc --url <vorschau> --lauf <run-url> [--ergebnis DIR] [--artefakt URL]
 *        [--bilder-basis URL] [--skip "Grund"] [--mehr N]
 *
 * Braucht GH_TOKEN, GITHUB_REPOSITORY. Vorschaubilder stehen unter `--bilder-basis` (raw-Adresse); fehlt sie, gibt es nur den Artefakt-Link.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fetchJson } from "../autonomy/http.mjs";

export const MARKER = "<!-- pr-crawler -->";

/**
 * Kommentartext: Übersprungen mit Grund, oder je Route Bilder, Funde und Video.
 * @param {{ ergebnis?: any, skip?: string, mehr?: number, url?: string, lauf?: string, artefakt?: string, bilderBasis?: string, sha?: string }} a
 */
export function baueKommentar({ ergebnis = null, skip = "", mehr = 0, url = "", lauf = "", artefakt = "", bilderBasis = "", sha = "" }) {
  const kopf = [MARKER, "## PR-Crawler"];
  const fuss = `<sub>${url ? `Vorschau ${url}` : "Vorschau"}${sha ? `, Stand ${sha.slice(0, 7)}` : ""}${lauf ? `, [Lauf](${lauf})` : ""}. Nur die geänderten Seiten; der nächtliche Vollcrawl bleibt.</sub>`;
  if (skip || !ergebnis) return [...kopf, "", `Übersprungen: ${skip || "kein Ergebnis."}`, "", fuss].join("\n");
  const rot = (ergebnis.funde ?? []).filter((f) => f.kategorie !== "lcp");
  const hinweise = (ergebnis.funde ?? []).filter((f) => f.kategorie === "lcp");
  const zeilen = [
    ...kopf,
    "",
    ergebnis.rot ? `**Rot:** ${ergebnis.rot} Fund(e) auf ${ergebnis.routen.length} Seite(n).` : `**Grün:** ${ergebnis.routen.length} Seite(n) geprüft, nichts gefunden.`,
    "",
  ];
  for (const route of ergebnis.routen) {
    zeilen.push(`### \`${route}\``);
    const bilder = (ergebnis.bilder ?? []).filter((b) => b.route === route);
    if (bilderBasis && bilder.length) zeilen.push(bilder.map((b) => `<img src="${bilderBasis}/${b.bild}" alt="${route} (${b.viewport})" width="${b.viewport === "handy" ? 200 : 420}">`).join(" "));
    else if (bilder.length) zeilen.push(`Bilder (${bilder.map((b) => b.viewport).join(", ")}) im Artefakt.`);
    for (const f of rot.filter((x) => x.route === route)) zeilen.push(`- ${f.kategorie} (${f.viewport ?? "-"}): ${f.text}`);
    zeilen.push("");
  }
  if (ergebnis.video?.datei) zeilen.push(`Ablauf über ${ergebnis.routen.length} Seiten als Video (WebM, ${ergebnis.video.mb} MB): Datei \`${ergebnis.video.datei}\` im Artefakt.`, "");
  else if (ergebnis.video?.hinweis) zeilen.push(ergebnis.video.hinweis, "");
  if (hinweise.length) zeilen.push(`Hinweis (kein Fehler): ${hinweise.map((h) => `${h.route} ${h.text}`).join("; ")}`, "");
  if (mehr) zeilen.push(`${mehr} weitere betroffene Seite(n) nicht geprüft (Obergrenze).`, "");
  if (artefakt) zeilen.push(`Bilder und Video: [Artefakt \`pr-crawler\`](${artefakt})`, "");
  return [...zeilen, fuss].join("\n");
}

async function gh(pfad, { method = "GET", body } = {}, env = process.env) {
  return fetchJson("GitHub", `https://api.github.com${pfad}`, {
    method,
    headers: { Authorization: `Bearer ${env.GH_TOKEN ?? env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Legt den Kommentar an oder ersetzt den mit dem Marker. */
export async function schreibe(pr, text, env = process.env) {
  const repo = env.GITHUB_REPOSITORY;
  const alle = await gh(`/repos/${repo}/issues/${pr}/comments?per_page=100`, {}, env);
  const alt = alle.find((c) => c.body?.includes(MARKER));
  if (alt) await gh(`/repos/${repo}/issues/comments/${alt.id}`, { method: "PATCH", body: { body: text } }, env);
  else await gh(`/repos/${repo}/issues/${pr}/comments`, { method: "POST", body: { body: text } }, env);
  return alt ? "aktualisiert" : "angelegt";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2);
  const arg = (n, d = "") => (a.includes(n) ? a[a.indexOf(n) + 1] : d);
  const ordner = arg("--ergebnis", "pr-crawler-ergebnis");
  let ergebnis = null;
  try {
    ergebnis = JSON.parse(readFileSync(`${ordner}/ergebnis.json`, "utf8"));
  } catch {
    /* kein Ergebnis: Kommentar sagt es */
  }
  const text = baueKommentar({ ergebnis, skip: arg("--skip"), mehr: Number(arg("--mehr", "0")), url: arg("--url"), lauf: arg("--lauf"), artefakt: arg("--artefakt"), bilderBasis: arg("--bilder-basis"), sha: arg("--sha") });
  schreibe(arg("--pr"), text).then(
    (r) => console.log(`PR-Crawler: Kommentar ${r}`),
    (e) => (console.log(`::warning::PR-Crawler: Kommentar nicht geschrieben (${e.message})`), process.exit(0)),
  );
}
