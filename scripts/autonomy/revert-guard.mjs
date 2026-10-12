#!/usr/bin/env node
/**
 * Entscheidung des Wächters revert-guard (SIN-502): Revert-PR nur, wenn er helfen kann.
 *
 * Rein: `decideRevert` (kein Netz). Netz getrennt: `main` liest Läufe per `gh api` und legt Linear-Issues an.
 *
 *   node scripts/autonomy/revert-guard.mjs --sha <sha> --run <id> [--name ci] [--title "<Commit-Titel>"]
 *   Ausgabe (eine Zeile, JSON): { aktion: "revert" | "gate-issue" | "melden" | "nichts", grund, schritte }
 *   Exit 0 immer; der Workflow liest `aktion`.
 *
 * Regeln:
 *  1. Roter Schritt war auf dem Eltern-Commit ebenfalls rot oder nicht gelaufen → kein Revert, Gate-Bruch-Issue.
 *  2. Höchstens 1 Revert je Stunde. Ist der rote Commit selbst ein Revert oder gab es in der letzten Stunde
 *     schon einen Revert-PR → Kette stoppen, Aufgabe für Sinan (Label `sinan`).
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const REVERT_WINDOW_MS = 60 * 60 * 1000;
export const REVERT_BRANCH_PREFIX = "claude/revert-";

/** true bei Revert-Commits (Titel `revert:` oder `Revert …`). */
export const isRevertTitle = (title = "") => /^(revert:|Revert\b)/.test(title);

/**
 * @param {{
 *   failed: string[],
 *   parent: Record<string, string>,
 *   title?: string,
 *   recentReverts?: { createdAt: string }[],
 *   now?: Date,
 * }} input failed: roter Schritt je Eintrag "Job / Schritt"; parent: Ergebnis je Schritt auf dem Eltern-Commit
 *   (fehlt = nicht gelaufen); recentReverts: Revert-PRs (alle Stände) mit Anlagezeit.
 * @returns {{ aktion: "revert" | "gate-issue" | "melden" | "nichts", grund: string, schritte: string[] }}
 */
export function decideRevert({ failed, parent, title = "", recentReverts = [], now = new Date() }) {
  const schritte = [...failed];
  if (isRevertTitle(title)) {
    return { aktion: "melden", grund: "Der rote Commit ist selbst ein Revert: Kette gestoppt.", schritte };
  }
  const recent = recentReverts.filter((r) => now.getTime() - new Date(r.createdAt).getTime() < REVERT_WINDOW_MS);
  if (recent.length) {
    return { aktion: "melden", grund: "In der letzten Stunde gab es schon einen Revert, ein zweiter roter Lauf stoppt die Kette.", schritte };
  }
  if (!failed.length) {
    return { aktion: "nichts", grund: "Kein einzelner roter Schritt erkennbar (Lauf ohne Schritt-Ergebnis).", schritte };
  }
  const vorherNichtGruen = failed.filter((s) => parent[s] !== "success");
  if (vorherNichtGruen.length) {
    return {
      aktion: "gate-issue",
      grund: `Schritt auf dem Eltern-Commit nicht grün (${vorherNichtGruen.map((s) => `${s}: ${parent[s] ?? "nicht gelaufen"}`).join("; ")}): der Commit ist nicht die Ursache.`,
      schritte: vorherNichtGruen,
    };
  }
  return { aktion: "revert", grund: "Alle roten Schritte waren auf dem Eltern-Commit grün.", schritte };
}

/** Ergebnis je Schritt ("Job / Schritt") aus den Jobs eines Laufs (`actions/runs/<id>/jobs`). */
export function stepResults(jobs) {
  /** @type {Record<string, string>} */
  const all = {};
  for (const job of jobs) {
    for (const s of job.steps ?? []) {
      if (s.conclusion) all[`${job.name} / ${s.name}`] = s.conclusion;
    }
  }
  return all;
}
export const failedSteps = (all) => Object.keys(all).filter((k) => all[k] === "failure");

// ---- Netz ----

const ghApi = (path) => JSON.parse(execFileSync("gh", ["api", path, "--paginate", "--slurp"], { encoding: "utf8" }));
const flat = (pages, key) => pages.flatMap((p) => (key ? (p[key] ?? []) : p));

async function main(argv) {
  const arg = (n) => argv[argv.indexOf(n) + 1];
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = arg("--sha");
  const name = arg("--name") ?? "ci";
  const title = arg("--title") ?? "";
  const jobs = flat(ghApi(`repos/${repo}/actions/runs/${arg("--run")}/jobs?per_page=100`), "jobs");
  const failed = failedSteps(stepResults(jobs));

  let parent = {};
  try {
    const parentSha = execFileSync("git", ["rev-parse", `${sha}^`], { encoding: "utf8" }).trim();
    const runs = flat(ghApi(`repos/${repo}/actions/runs?head_sha=${parentSha}&per_page=100`), "workflow_runs").filter(
      (r) => r.name === name && r.status === "completed",
    );
    runs.sort((a, b) => b.run_number - a.run_number);
    if (runs[0]) parent = stepResults(flat(ghApi(`repos/${repo}/actions/runs/${runs[0].id}/jobs?per_page=100`), "jobs"));
  } catch (e) {
    console.error(`Eltern-Lauf nicht lesbar: ${e.message}`);
  }

  const prs = flat(ghApi(`repos/${repo}/pulls?state=all&sort=created&direction=desc&per_page=30`));
  const recentReverts = prs.filter((p) => p.head?.ref?.startsWith(REVERT_BRANCH_PREFIX)).map((p) => ({ createdAt: p.created_at }));

  const result = decideRevert({ failed, parent, title, recentReverts });
  console.error(`revert-guard: ${result.aktion}: ${result.grund}`);

  if (result.aktion === "gate-issue" || result.aktion === "melden") {
    try {
      await meldung(result, { sha, name });
    } catch (e) {
      console.error(`Issue nicht angelegt: ${e.message}`);
    }
  }
  console.log(JSON.stringify(result));
}

async function meldung(result, { sha, name }) {
  const { fetchProjectIssues, createLinearIssues } = await import("./linear.mjs");
  const { GATE_PREFIX } = await import("./warten.mjs");
  const { createSinanIssues, fetchSinanIssues } = await import("./sinan.mjs");
  const link = `https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${sha}`;
  if (result.aktion === "gate-issue") {
    const known = await fetchProjectIssues();
    const open = (i) => !["completed", "canceled"].includes(i.state?.type);
    const items = result.schritte
      .map((s) => ({
        title: `${GATE_PREFIX} ${name} / ${s}`,
        description: `Auf main rot: \`${s}\` (Commit ${link}). ${result.grund} Ein Revert hilft nicht (SIN-502).`,
        priority: 1,
        labels: ["claude", "bug"],
      }))
      .filter((it) => !known.some((k) => open(k) && k.title === it.title));
    await createLinearIssues(items);
  } else {
    await createSinanIssues(
      [
        {
          titel: `revert-guard gestoppt: weiterer roter Lauf auf main (${sha.slice(0, 7)})`,
          wo: "GitHub Actions, Workflow ci auf main",
          link,
          minuten: 10,
          schritte: [`1. Roten Lauf zum Commit ${sha.slice(0, 7)} öffnen und die Ursache prüfen.`, "2. Offene Revert-PRs (Branch claude/revert-*) ansehen und entscheiden, ob sie gemergt oder geschlossen werden."],
          pruefung: "main ist grün (ci auf dem neuesten Commit) und kein Revert-PR ist offen.",
        },
      ],
      await fetchSinanIssues(),
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    console.log(JSON.stringify({ aktion: "nichts", grund: `Fehler: ${e.message}`, schritte: [] }));
  });
}
