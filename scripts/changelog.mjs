#!/usr/bin/env node
/**
 * CHANGELOG.md aus den Conventional-Commit-Titeln auf main (SIN-300), ohne KI und ohne Abhängigkeit.
 * Jeder Squash-Merge ist ein Commit mit dem PR-Titel (`feat(lernpfad): Fortschrittsbalken (SIN-123) (#45)`).
 *
 *   node scripts/changelog.mjs            schreibt CHANGELOG.md aus `git log` (braucht die volle Historie)
 *   node scripts/changelog.mjs --check    Exit 1, wenn CHANGELOG.md nicht dem Verlauf entspricht
 *
 * Die Datei ist erzeugt und wird nie von Hand bearbeitet. Der wöchentliche Aufräum-Lauf aktualisiert sie im
 * Aufräum-PR (.github/workflows/aufraeumen.yml).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const FILE = "CHANGELOG.md";
const TYPES = [
  ["feat", "Neu"],
  ["fix", "Behoben"],
  ["perf", "Schneller"],
  ["refactor", "Aufgeräumt"],
  ["docs", "Dokumentation"],
  ["test", "Tests"],
  ["ci", "Automatisierung"],
  ["chore", "Pflege"],
];
const RE = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+?)(?:\s*\(#(\d+)\))?$/;

/** Ein Commit-Titel → Eintrag, oder null (kein Conventional Commit, Revert-Rauschen). */
export function parseSubject(subject) {
  const m = RE.exec(subject.trim());
  if (!m) return null;
  const [, type, scope, breaking, rest, pr] = m;
  if (!TYPES.some(([t]) => t === type)) return null;
  const issue = /\((SIN-\d+)\)/.exec(rest)?.[1];
  return { type, scope: scope ?? "", breaking: !!breaking, text: rest.replace(/\s*\(SIN-\d+\)/, "").trim(), issue, pr };
}

/**
 * Markdown aus Commits, neueste zuerst gruppiert nach Monat und Art.
 * @param {{ subject: string, date: string }[]} commits `date` = YYYY-MM-DD
 */
export function render(commits) {
  const byMonth = new Map();
  for (const c of commits) {
    const e = parseSubject(c.subject);
    if (!e) continue;
    const month = c.date.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), e]);
  }
  const out = ["# Changelog", "", "Erzeugt aus den Titeln der gemergten Pull Requests (`npm run changelog`), nicht von Hand bearbeiten.", ""];
  for (const month of [...byMonth.keys()].sort().reverse()) {
    out.push(`## ${month}`, "");
    for (const [type, label] of TYPES) {
      const entries = byMonth.get(month).filter((e) => e.type === type);
      if (!entries.length) continue;
      out.push(`### ${label}`, "");
      for (const e of entries) {
        const refs = [e.issue, e.pr && `#${e.pr}`].filter(Boolean).join(", ");
        out.push(`- ${e.breaking ? "**Bruch:** " : ""}${e.scope ? `${e.scope}: ` : ""}${e.text}${refs ? ` (${refs})` : ""}`);
      }
      out.push("");
    }
  }
  return out.join("\n");
}

function gitCommits() {
  const log = execFileSync("git", ["log", "--first-parent", "--format=%ad\t%s", "--date=short"], { encoding: "utf8", maxBuffer: 64 << 20 });
  return log
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [date, ...rest] = l.split("\t");
      return { date, subject: rest.join("\t") };
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() === "true";
  if (shallow) {
    console.error("Flaches Repository: `git fetch --unshallow` zuerst, sonst fehlt die Historie.");
    process.exit(1);
  }
  const text = render(gitCommits());
  if (process.argv.includes("--check")) {
    const ok = existsSync(FILE) && readFileSync(FILE, "utf8") === text;
    if (!ok) console.error(`${FILE} ist veraltet: 'npm run changelog' ausführen.`);
    process.exit(ok ? 0 : 1);
  }
  writeFileSync(FILE, text);
  console.log(`${FILE} geschrieben.`);
}
