#!/usr/bin/env node
/**
 * Bericht zum Bildvergleich (SIN-300): liest den JSON-Bericht von Playwright und schreibt Markdown
 * für den Steckbrief (GitHub Step Summary): je Abweichung Seite, Gerät und die Bilder Vorher/Nachher/Unterschied.
 *
 *   node scripts/autonomy/visual-report.mjs visual-ergebnis/ergebnis.json
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

/** Alle Tests des Playwright-JSON-Berichts, flach. */
function tests(report) {
  const out = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) out.push({ title: spec.title, ...t });
    for (const s of suite.suites ?? []) walk(s);
  };
  for (const s of report.suites ?? []) walk(s);
  return out;
}

/** @returns {{ total: number, changed: { route: string, device: string, images: string[] }[] }} */
export function summarize(report) {
  const all = tests(report);
  const changed = all
    .filter((t) => t.results?.some((r) => r.status === "failed" || r.status === "timedOut"))
    .map((t) => ({
      route: t.title.replace(/^Bild\s+/, ""),
      device: t.projectName,
      images: (t.results.at(-1)?.attachments ?? []).filter((a) => a.path && /-(expected|actual|diff)\.png$/.test(a.path)).map((a) => a.path),
    }));
  return { total: all.length, changed };
}

/** Markdown für den Steckbrief. */
export function renderVisualReport(report) {
  const { total, changed } = summarize(report);
  if (!total) return "## Bildvergleich\n\nKeine Seiten fotografiert.\n";
  if (!changed.length) return `## Bildvergleich\n\nKeine Abweichung zu main (${total} Bilder: Handy und Desktop).\n`;
  return [
    "## Bildvergleich",
    "",
    `${changed.length} von ${total} Bildern weichen von main ab. Gewollt bei einem Frontend-Issue: nichts zu tun, die Referenz ist nach dem Merge der neue Stand von main. Unerwartet: Änderung prüfen.`,
    "",
    ...changed.map((c) => `- \`${c.route}\` (${c.device}): ${c.images.map((p) => basename(p).replace(/^.*-(expected|actual|diff)\.png$/, "$1")).join(", ") || "ohne Bild"}`),
    "",
    "Vorher (expected), Nachher (actual) und Unterschied (diff) liegen im Artefakt `bildvergleich` dieses Laufs.",
    "",
  ].join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const file = process.argv[2] ?? "visual-ergebnis/ergebnis.json";
  console.log(renderVisualReport(JSON.parse(readFileSync(file, "utf8"))));
}
