#!/usr/bin/env node
/**
 * Index der Entscheidungen (SIN-240): erzeugt docs/DECISIONS.md aus docs/decisions/<ISSUE-ID>-<kurz>.md.
 *
 *   node scripts/decisions-index.mjs           schreibt docs/DECISIONS.md
 *   node scripts/decisions-index.mjs --check   Exit 1, wenn die Datei nicht dem Index entspricht
 *
 * Eine Datei je Entscheidung, keine laufenden Nummern: parallele PRs fassen nie dieselbe Datei an.
 * docs/DECISIONS.md wird nie von Hand bearbeitet: `npm run decisions:index` vor dem Push, im selben PR (SIN-251).
 * Der CI-Schritt „Entscheidungs-Index aktuell“ prüft mit --check.
 * Die alten Einträge D-01 bis D-47 stehen unverändert in docs/decisions/ARCHIV-D-01-D-47.md.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ARCHIVE = "ARCHIV-D-01-D-47.md";
const NAME_RE = /^([A-Z]+)-(\d+)-.+\.md$/;

/** Überschrift der Entscheidung: erste Markdown-Überschrift ohne „#“, sonst der Dateiname. */
export function titleOf(name, content) {
  const m = String(content).match(/^#{1,6}\s+(.+)$/m);
  return (m ? m[1] : name.replace(/\.md$/, "")).replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}

/**
 * Index-Text. @param {{ name: string, content: string }[]} files Dateien in docs/decisions/
 * Neueste (höchste Issue-Nummer) zuerst; Dateien, die nicht <ISSUE-ID>-<kurz>.md heißen, fehlen im Index.
 */
export function buildIndex(files) {
  const rows = files
    .filter((f) => NAME_RE.test(f.name))
    .map((f) => ({ ...f, id: f.name.match(/^([A-Z]+-\d+)/)[1], n: Number(f.name.match(NAME_RE)[2]) }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return [
    "# Architekturentscheidungen",
    "",
    "<!-- Erzeugt von scripts/decisions-index.mjs (npm run decisions:index). Nicht von Hand bearbeiten. -->",
    "",
    "Jede Entscheidung ist eine eigene Datei `docs/decisions/<ISSUE-ID>-<kurz>.md` (Links, Entscheidung, Annahmen, Warum).",
    "Keine laufenden Nummern, damit parallele PRs nicht an derselben Datei konfligieren. Diesen Index nie bearbeiten:",
    "`npm run decisions:index` erzeugt ihn, der Agent committet ihn im selben PR (CI prüft ihn).",
    "",
    `Ältere Entscheidungen D-01 bis D-47 (inklusive Blocker-Tabelle) stehen unverändert in [${ARCHIVE}](decisions/${ARCHIVE}).`,
    "Modellnamen und Features nur aus aktuellen Docs/Repos, nie aus dem Gedächtnis.",
    "",
    "## Entscheidungen",
    "",
    "| Issue | Titel | Datei |",
    "| --- | --- | --- |",
    ...rows.map((r) => `| ${r.id} | ${titleOf(r.name, r.content)} | [${r.name}](decisions/${r.name}) |`),
    "",
  ].join("\n");
}

export function readDecisions(dir) {
  return readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .map((name) => ({ name, content: readFileSync(join(dir, name), "utf8") }));
}

export function main(argv, root = fileURLToPath(new URL("..", import.meta.url))) {
  const out = join(root, "docs", "DECISIONS.md");
  const index = buildIndex(readDecisions(join(root, "docs", "decisions")));
  if (argv.includes("--check")) {
    const current = existsSync(out) ? readFileSync(out, "utf8") : "";
    if (current !== index) {
      console.error("docs/DECISIONS.md ist veraltet: `npm run decisions:index` ausführen.");
      return 1;
    }
    console.log("docs/DECISIONS.md ist aktuell.");
    return 0;
  }
  writeFileSync(out, index);
  console.log("docs/DECISIONS.md geschrieben.");
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)));
