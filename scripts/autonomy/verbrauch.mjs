#!/usr/bin/env node
/**
 * Verbrauch eines Claude-Laufs melden (SIN-320). Liest die Execution-Datei von claude-code-action und
 *   - hängt eine Zeile unter „## Verbrauch“ an den PR-Text (der Steckbrief zeigt sie, das Tages-Update summiert sie),
 *   - schreibt einen Kommentar ans Linear-Issue (nur mit LINEAR_API_KEY, z. B. im Worker).
 *
 *   node scripts/autonomy/verbrauch.mjs --file <execution_file> --branch claude/sin-1 --label "Worker" --model <id>
 *        [--issues "SIN-1 SIN-2"] [--run <run-id>]
 *
 * Nie ein Fehlerabbruch: fehlt Datei, PR oder Netz, steht nur eine Warnung im Log (Messen darf den Lauf nicht kippen).
 * Braucht GITHUB_REPOSITORY und GH_TOKEN (oder GITHUB_TOKEN).
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { comment, fetchProjectIssues } from "./linear.mjs";
import { appendUsage, usageComment, usageFromExecution, usageLine } from "./sparen.mjs";

async function gh(path, { method = "GET", body } = {}, env = process.env) {
  const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path}: ${res.status}`);
  return res.json();
}

export async function main(argv, env = process.env) {
  const arg = (n, d = "") => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const file = arg("--file");
  const label = arg("--label", "Lauf");
  const model = arg("--model");
  const run = arg("--run", env.GITHUB_RUN_ID ?? "") + (arg("--part") ? `-${arg("--part")}` : "");
  const issues = arg("--issues").split(/[\s,+]+/).filter(Boolean);
  const u = file && existsSync(file) ? usageFromExecution(readFileSync(file, "utf8")) : null;
  console.log(usageLine(u, label, model));
  if (!u) return;

  const repo = env.GITHUB_REPOSITORY;
  const branch = arg("--branch");
  if (repo && branch && (env.GH_TOKEN || env.GITHUB_TOKEN)) {
    try {
      const [owner] = repo.split("/");
      const prs = await gh(`/repos/${repo}/pulls?state=open&head=${owner}:${branch}`, {}, env);
      if (prs[0]) {
        const body = appendUsage(prs[0].body, u, { label, model, run, issues });
        if (body !== prs[0].body) await gh(`/repos/${repo}/pulls/${prs[0].number}`, { method: "PATCH", body: { body } }, env);
      } else console.log("Kein offener PR für den Branch: Verbrauch nur im Log.");
    } catch (e) {
      console.log(`::warning::Verbrauch nicht in den PR geschrieben: ${e.message}`);
    }
  }
  if (env.LINEAR_API_KEY && issues.length) {
    try {
      const all = await fetchProjectIssues();
      const first = all.find((i) => i.identifier === issues[0]);
      if (first) await comment(first.id, usageComment(issues.join(", "), [usageLine(u, label, model)]));
    } catch (e) {
      console.log(`::warning::Verbrauch nicht nach Linear geschrieben: ${e.message}`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => console.log(`::warning::${e.message}`));
}
