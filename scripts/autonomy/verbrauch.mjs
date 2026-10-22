#!/usr/bin/env node
/**
 * Verbrauch eines Claude-Laufs melden (SIN-320). Liest die Execution-Datei von claude-code-action und
 *   - speichert strukturierte Verbrauchsmarker ausschließlich privat in Linear,
 *   - schreibt einen Kommentar ans Linear-Issue (nur mit LINEAR_API_KEY, z. B. im Worker).
 *
 *   node scripts/autonomy/verbrauch.mjs --file <execution_file> --branch claude/sin-1 --label "Worker" --model <id>
 *        [--issues "SIN-1 SIN-2"] [--run <run-id>]
 *
 * Nie ein Fehlerabbruch: fehlt Datei, PR oder Netz, steht nur eine Warnung im Log (Messen darf den Lauf nicht kippen).
 * Braucht LINEAR_API_KEY, GITHUB_REPOSITORY, --issues und eine Laufkennung.
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { linear } from "./linear.mjs";
import { recordPrivateUsage } from "./private-usage.mjs";
import { usageFromExecution } from "./sparen.mjs";

export async function main(argv, env = process.env, call = (q, v) => linear(q, v, {key:env.LINEAR_API_KEY})) {
  const arg = (n, d = "") => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const file = arg("--file");
  const label = arg("--label", "Lauf");
  const model = arg("--model");
  const run = arg("--run", env.GITHUB_RUN_ID ?? "") + (arg("--part") ? `-${arg("--part")}` : "");
  const issues = [...new Set((arg("--issues") || env.USAGE_ISSUES || arg("--branch")).match(/SIN-\d+/gi)?.map(id => id.toUpperCase()) ?? [])];
  const u = file && existsSync(file) ? usageFromExecution(readFileSync(file, "utf8")) : null;
  console.log(u ? "Verbrauch erfasst; Details bleiben privat." : "Verbrauch nicht lesbar.");
  if (!u) return;

  if (!env.LINEAR_API_KEY || !issues.length) {
    console.log("::warning::Privater Verbrauch nicht gespeichert: Linear-Zugang oder Issue fehlt.");
    return;
  }
  try {
    await recordPrivateUsage(issues, u, {label, model, run, repository:env.GITHUB_REPOSITORY,branch:arg("--branch"),at:new Date().toISOString()}, call);
  } catch {
    console.log("::warning::Privater Verbrauch konnte nicht gespeichert werden; kein öffentlicher Fallback.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => console.log(`::warning::${e.message}`));
}
