#!/usr/bin/env node
/**
 * Dispatcher (SIN-223): wählt das nächste Linear-Issue und gibt es für den Workflow aus.
 *
 *   node scripts/autonomy/dispatch.mjs [--dry-run]     wählen (+ In Progress, außer Dry-Run)
 *   node scripts/autonomy/dispatch.mjs --done SIN-123   Linear auf Done (nach Merge)
 *   node scripts/autonomy/dispatch.mjs --blocker SIN-123 "Text"   Blocker-Kommentar
 *
 * Ausgabe für GitHub Actions: GITHUB_OUTPUT (found, identifier, prompt).
 * Dry-Run: nur lesen, nichts in Linear ändern. Ohne LINEAR_API_KEY: `--fixture datei.json`.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { MAX_REPAIR_ROUNDS, buildPrompt, comment, fetchProjectIssues, linear, pickNext, setState } from "./linear.mjs";

async function findByIdentifier(identifier) {
  const issues = await fetchProjectIssues();
  const issue = issues.find((i) => i.identifier === identifier);
  if (!issue) throw new Error(`${identifier} nicht im Projekt gefunden (oder schon abgeschlossen)`);
  return issue;
}

function output(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const delim = `EOF_${Math.random().toString(36).slice(2)}`;
  appendFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`);
}

export async function main(argv) {
  const dry = argv.includes("--dry-run");
  const fixtureAt = argv.indexOf("--fixture");

  const doneAt = argv.indexOf("--done");
  if (doneAt >= 0) {
    const issue = await findByIdentifier(argv[doneAt + 1]);
    if (dry) return console.log(`[dry-run] ${issue.identifier} → Done`);
    await setState(issue, "Done");
    return console.log(`${issue.identifier} → Done`);
  }

  const blockerAt = argv.indexOf("--blocker");
  if (blockerAt >= 0) {
    const issue = await findByIdentifier(argv[blockerAt + 1]);
    const text = `Blocker nach ${MAX_REPAIR_ROUNDS} Reparatur-Runden: ${argv[blockerAt + 2] ?? "siehe PR"}`;
    if (dry) return console.log(`[dry-run] Kommentar an ${issue.identifier}: ${text}`);
    await comment(issue.id, text);
    return console.log(`Blocker-Kommentar an ${issue.identifier}`);
  }

  const issues =
    fixtureAt >= 0
      ? JSON.parse(readFileSync(argv[fixtureAt + 1], "utf8"))
      : await fetchProjectIssues(linear);
  const { issue, reason } = pickNext(issues);
  if (!issue) {
    console.log(`Nichts zu starten: ${reason}`);
    output("found", "false");
    return;
  }
  const prompt = buildPrompt(issue);
  console.log(`${dry ? "[dry-run] " : ""}Nächstes Issue: ${issue.identifier} (${issue.title}), Priorität ${issue.priority}`);
  if (dry) console.log(`\n${prompt}`);
  else await setState(issue, "In Progress");
  output("found", "true");
  output("identifier", issue.identifier);
  output("prompt", prompt);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
