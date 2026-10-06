#!/usr/bin/env node
/**
 * Aufräum-Scan (SIN-300): findet ohne KI und ohne neue Pakete
 *   1. Dateien unter src/, die niemand importiert,
 *   2. Pakete in package.json, die nirgends vorkommen,
 *   3. zu große Dateien (> MAX_LINES Zeilen),
 *   4. doppelte Blöcke (≥ DUP_LINES gleiche Zeilen in zwei Dateien).
 * Der wöchentliche Aufräum-Agent (.github/workflows/aufraeumen.yml) startet damit und macht daraus ein PR.
 * Treffer sind Hinweise, keine Urteile: der Agent prüft jeden einzeln.
 *
 *   node scripts/autonomy/cleanup-scan.mjs [--json]
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_LINES = 500;
export const DUP_LINES = 12;
const CODE = /\.(m?[jt]sx?)$/;
const PEERS = ["react-dom", "@types/react-dom", "@opentelemetry/api"];
/** Dateien, die Next.js oder ein Werkzeug selbst lädt: nie „ungenutzt“. */
const ENTRY = /(^|\/)(page|layout|route|loading|error|global-error|not-found|template|default|instrumentation(-client)?|proxy|middleware|sw|manifest|robots|sitemap|opengraph-image|icon)\.[mjt]sx?$|\.test\.[mjt]sx?$|\.spec\.[mjt]sx?$/;

/** Alle Code-Dateien unter `dir`, relativ zum Repo. */
export function walk(dir, root = ".") {
  const out = [];
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const rel = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(rel, root));
    else if (CODE.test(e.name)) out.push(rel);
  }
  return out;
}

/** Importziele einer Datei: relative Pfade ("./x") und `@/`-Pfade (= src/), als Repo-Pfade ohne Endung. */
export function importsOf(file, source) {
  const specs = [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);
  return specs
    .filter((s) => s.startsWith(".") || s.startsWith("@/"))
    .map((s) => (s.startsWith("@/") ? join("src", s.slice(2)) : join(dirname(file), s)))
    .map((p) => normalize(p).replace(/\.[mjt]sx?$/, ""));
}

/** Dateien unter src/, die keine andere Datei importiert (Einstiegsdateien von Next.js ausgenommen). */
export function unusedFiles(files) {
  const used = new Set();
  // Ein Test, der eine Datei importiert, macht sie nicht „genutzt“.
  for (const { file, source } of files) if (!/\.(test|spec)\./.test(file)) for (const target of importsOf(file, source)) used.add(target);
  return files
    .map((f) => f.file)
    .filter((f) => f.startsWith("src/") && !ENTRY.test(f))
    .filter((f) => {
      const stem = f.replace(/\.[mjt]sx?$/, "");
      return !used.has(stem) && !used.has(stem.replace(/\/index$/, ""));
    });
}

/** Pakete aus package.json, die in keiner Datei und in keiner Konfiguration auftauchen. */
export function deadDependencies(pkg, haystack) {
  const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  // Pflicht ohne eigenen Import: Peer-Pakete von next/react/@langfuse und per „overrides“ festgenagelte Versionen.
  const needed = new Set([...PEERS, ...Object.keys(pkg.overrides ?? {})]);
  return names.filter((n) => {
    if (needed.has(n)) return false;
    if (n.startsWith("@types/")) return !haystack.includes(n.slice(7)) && !haystack.includes(n);
    return !haystack.includes(`"${n}`) && !haystack.includes(`'${n}`) && !haystack.includes(`${n}/`) && !haystack.includes(`${n}"`);
  });
}

export function largeFiles(files, max = MAX_LINES) {
  return files.map((f) => ({ file: f.file, lines: f.source.split("\n").length })).filter((f) => f.lines > max).sort((a, b) => b.lines - a.lines);
}

/** Doppelte Blöcke: gleiche, nicht leere Zeilenfolge (getrimmt) in zwei verschiedenen Dateien. */
export function duplicateBlocks(files, size = DUP_LINES) {
  const seen = new Map();
  const found = new Map();
  for (const { file, source } of files) {
    const lines = source.split("\n").map((l) => l.trim());
    for (let i = 0; i + size <= lines.length; i++) {
      const block = lines.slice(i, i + size);
      if (block.filter((l) => l.length > 3).length < size - 2) continue; // Klammern und Leerzeilen zählen nicht
      const key = block.join("\n");
      const first = seen.get(key);
      if (!first) seen.set(key, { file, line: i + 1 });
      else if (first.file !== file) found.set(`${first.file}:${first.line}|${file}:${i + 1}`, { a: first, b: { file, line: i + 1 } });
    }
  }
  // Überlappende Treffer desselben Dateipaars zu einem zusammenfassen.
  const byPair = new Map();
  for (const { a, b } of found.values()) {
    const pair = `${a.file}|${b.file}`;
    const prev = byPair.get(pair);
    if (!prev || b.line < prev.b.line) byPair.set(pair, { a, b, blocks: (prev?.blocks ?? 0) + 1 });
    else prev.blocks++;
  }
  return [...byPair.values()].sort((x, y) => y.blocks - x.blocks);
}

/** Bericht als Markdown. */
export function render({ unused, dead, large, dups }) {
  const list = (xs, fmt) => (xs.length ? xs.map((x) => `- ${fmt(x)}`).join("\n") : "- keine");
  return [
    "# Aufräum-Scan",
    "",
    `## Ungenutzte Dateien (${unused.length})`,
    list(unused, (f) => `\`${f}\``),
    "",
    `## Pakete ohne Verwendung (${dead.length})`,
    list(dead, (n) => `\`${n}\``),
    "",
    `## Dateien über ${MAX_LINES} Zeilen (${large.length})`,
    list(large, (f) => `\`${f.file}\` (${f.lines} Zeilen)`),
    "",
    `## Doppelte Blöcke ab ${DUP_LINES} Zeilen (${dups.length} Dateipaare)`,
    list(dups.slice(0, 20), (d) => `\`${d.a.file}:${d.a.line}\` ≈ \`${d.b.file}:${d.b.line}\` (${d.blocks} überlappende Treffer)`),
    "",
  ].join("\n");
}

export function scan(root = ".") {
  const roots = ["src", "scripts", "e2e", "visual"].filter((d) => {
    try {
      readdirSync(join(root, d));
      return true;
    } catch {
      return false;
    }
  });
  const files = roots.flatMap((d) => walk(d, root)).map((file) => ({ file, source: readFileSync(join(root, file), "utf8") }));
  const src = files.filter((f) => f.file.startsWith("src/"));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const configs = ["next.config.ts", "eslint.config.mjs", "postcss.config.mjs", "playwright.config.ts", "playwright.visual.config.ts", "tsconfig.json", "vercel.json"].map((f) => {
    try {
      return readFileSync(join(root, f), "utf8");
    } catch {
      return "";
    }
  });
  // package.json zählt nur mit den Skripten als Verwendung (sonst steht jedes Paket sich selbst im Weg).
  const haystack = [...files.map((f) => f.source), ...configs, JSON.stringify(pkg.scripts ?? {})].join("\n");
  return {
    unused: unusedFiles(files),
    dead: deadDependencies(pkg, haystack),
    large: largeFiles(src),
    dups: duplicateBlocks(src.filter((f) => !/\.test\./.test(f.file))),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = scan();
  console.log(process.argv.includes("--json") ? JSON.stringify(result, null, 2) : render(result));
}
