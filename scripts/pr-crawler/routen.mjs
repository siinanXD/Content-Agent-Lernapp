#!/usr/bin/env node
/**
 * PR-Crawler, Schritt 1 (SIN-906): welche Seiten berührt ein PR? Aus den geänderten Dateien werden die Routen abgeleitet:
 * `src/app/**\/page.tsx` → Route, Komponenten und `lib`-Dateien → jede Seite, die sie (auch über andere Dateien) importiert.
 * Ohne Treffer überspringt der Crawler mit Grund.
 *
 *   node scripts/pr-crawler/routen.mjs --dateien dateien.txt --quelle pr-quelle   → JSON { routen, mehr, grund }
 *
 * `--quelle` ist ein Checkout des PRs, der nur gelesen wird (nie ausgeführt). Routenliste: e2e/routes.ts (aus dem Hauptstand).
 * shortcut: Importe per Regex gelesen (kein TS-Parser), dynamische `import(variable)` fehlen; höchstens 6 Seiten, bei Bedarf ausbauen.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { leseRouten, routeFuer } from "../autonomy/sichtpruefung.mjs";

export const MAX_ROUTEN = 6;
const ENDUNGEN = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** Ändert diese Datei, was ein Nutzer sieht? Quelltext unter `src` (ohne Tests und API-Routen) und Stile. */
export const istOberflaeche = (d) => /^src\/.+\.(tsx?|css)$/.test(d) && !/\.test\.tsx?$/.test(d) && !d.startsWith("src/app/api/");

/** Ziele aller `import … from "x"`, `import "x"` und `import("x")` in einer Datei. */
export function importe(quelle) {
  return [...quelle.matchAll(/(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g)].map((m) => m[1]);
}

/** Importziel → Dateipfad im Satz `dateien` (`@/` = `src/`, relative Pfade ab der importierenden Datei); sonst null. */
export function loese(von, spec, dateien) {
  const basis = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? path.posix.join(path.posix.dirname(von), spec) : null;
  if (!basis) return null;
  return ENDUNGEN.map((e) => basis + e).find((p) => p in dateien) ?? null;
}

/** Alle Dateien, die eine Datei (auch über andere) erreicht, samt ihr selbst. */
function erreichbar(start, dateien) {
  const gesehen = new Set(start);
  const stapel = [...start];
  while (stapel.length) {
    const d = stapel.pop();
    for (const spec of importe(dateien[d] ?? "")) {
      const ziel = loese(d, spec, dateien);
      if (ziel && !gesehen.has(ziel)) {
      gesehen.add(ziel);
      stapel.push(ziel);
    }
    }
  }
  return gesehen;
}

/**
 * @param {string[]} geaendert  Dateien des PRs
 * @param {Record<string, string>} dateien  Pfad → Text aller Quelldateien unter `src` im PR-Stand
 * @param {string[]} routen  Beispielrouten (e2e/routes.ts)
 * @returns {{ routen: string[], mehr: number, grund: string }}
 */
export function betroffeneRouten(geaendert, dateien, routen) {
  const ui = geaendert.filter(istOberflaeche);
  if (!ui.length) return { routen: [], mehr: 0, grund: "Keine Frontend-Änderung (nur Doku, Tests, Workflows, API oder Skripte)." };
  const treffer = [];
  for (const seite of Object.keys(dateien).filter((d) => /^src\/app\/(.+\/)?page\.tsx$/.test(d))) {
    const verz = path.posix.dirname(seite).replace(/^src\/app\/?/, "");
    // Eine Seite besteht aus ihrer Datei und den Layouts auf dem Weg dorthin.
    const layouts = ["", ...verz.split("/").filter(Boolean).map((_, i, a) => a.slice(0, i + 1).join("/"))].map((v) => path.posix.join("src/app", v, "layout.tsx")).filter((l) => l in dateien);
    const bereich = erreichbar([seite, ...layouts], dateien);
    const route = routeFuer(verz, routen);
    if (route && ui.some((d) => bereich.has(d))) treffer.push({ route, direkt: ui.some((d) => path.posix.dirname(d) === path.posix.dirname(seite)) });
  }
  if (!treffer.length) return { routen: [], mehr: 0, grund: "Die geänderten Dateien gehören zu keiner Seite aus e2e/routes.ts." };
  treffer.sort((a, b) => Number(b.direkt) - Number(a.direkt));
  const alle = treffer.map((t) => t.route);
  return { routen: alle.slice(0, MAX_ROUTEN), mehr: Math.max(0, alle.length - MAX_ROUTEN), grund: "" };
}

/** Texte aller Quelldateien unter `<wurzel>/src` (.css leer, spart Speicher). */
export function leseQuelle(wurzel) {
  const out = {};
  const geh = (verz) => {
    for (const e of readdirSync(path.join(wurzel, verz), { withFileTypes: true })) {
      const rel = `${verz}/${e.name}`;
      if (e.isDirectory()) geh(rel);
      else if (/\.tsx?$/.test(e.name)) out[rel] = readFileSync(path.join(wurzel, rel), "utf8");
      else if (e.name.endsWith(".css")) out[rel] = "";
    }
  };
  geh("src");
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n) => process.argv[process.argv.indexOf(n) + 1];
  const geaendert = readFileSync(arg("--dateien"), "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
  const ergebnis = betroffeneRouten(geaendert, leseQuelle(arg("--quelle")), leseRouten(readFileSync("e2e/routes.ts", "utf8")));
  console.log(JSON.stringify(ergebnis));
}
