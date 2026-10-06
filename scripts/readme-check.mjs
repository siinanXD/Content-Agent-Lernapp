#!/usr/bin/env node
/**
 * README-Erinnerung (SIN-300): ändert ein PR Funktion, Einrichtung, Befehle oder Umgebungsvariablen, ohne
 * README.md anzufassen, gibt der CI-Schritt eine Warnung aus (kein Fehler: nicht jede Änderung braucht Text).
 *
 *   node scripts/readme-check.mjs [--base origin/main]
 *
 * Auslöser: neue/gelöschte Seite unter src/app (page.tsx), geänderte Skripte oder Pakete in package.json,
 * geänderte .env.example, neues Skript unter scripts/, geänderte Workflows.
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * @param {{ status: string, file: string }[]} changes Ausgabe von `git diff --name-status`
 * @returns {string[]} Gründe, aus denen die README angepasst werden sollte (leer = nichts nötig)
 */
export function readmeReasons(changes) {
  if (changes.some((c) => c.file === "README.md")) return [];
  const reasons = [];
  if (changes.some((c) => /^src\/app\/.*page\.tsx$/.test(c.file) && /^[AD]/.test(c.status))) reasons.push("Seite unter src/app hinzugefügt oder entfernt");
  if (changes.some((c) => c.file === "package.json")) reasons.push("package.json geändert (Befehle oder Pakete)");
  if (changes.some((c) => c.file === ".env.example")) reasons.push(".env.example geändert (Umgebungsvariablen)");
  if (changes.some((c) => /^scripts\/[^/]+\.(mjs|ts)$/.test(c.file) && c.status.startsWith("A"))) reasons.push("neues Skript unter scripts/");
  if (changes.some((c) => /^\.github\/workflows\//.test(c.file))) reasons.push("Workflow geändert");
  return reasons;
}

/** `git diff --name-status` → [{ status, file }] (Umbenennungen zählen mit dem neuen Namen). */
export function parseNameStatus(text) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [status, ...files] = l.split("\t");
      return { status, file: files.at(-1) };
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const i = process.argv.indexOf("--base");
  const base = i === -1 ? "origin/main" : process.argv[i + 1];
  const diff = execFileSync("git", ["diff", "--name-status", base, "HEAD"], { encoding: "utf8" });
  const reasons = readmeReasons(parseNameStatus(diff));
  if (reasons.length) {
    console.log(`::warning title=README prüfen::${reasons.join("; ")}. README.md im selben PR anpassen (Funktion, Einrichtung, Befehle, Umgebungsvariablen) oder im PR begründen, warum nicht.`);
  } else {
    console.log("README: nichts zu tun.");
  }
}
