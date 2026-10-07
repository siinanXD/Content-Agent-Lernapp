#!/usr/bin/env node
/**
 * Konflikte in erzeugten Dateien ohne KI lösen (SIN-312).
 *
 *   node scripts/autonomy/konflikt.mjs [--dry-run]   alle offenen Agenten-PRs mit Konflikt prüfen (GITHUB_REPOSITORY, GH_TOKEN)
 *
 * Betrifft ein Merge-Konflikt nur erzeugte Dateien (docs/DECISIONS.md, CHANGELOG.md), wird `origin/main` in den
 * Branch gemergt, der Index mit `scripts/decisions-index.mjs` neu erzeugt, committet und gepusht (Agenten-Token,
 * damit `ci` neu läuft). Echte Code-Konflikte bleiben liegen: der Wächter (status.mjs) bittet dafür @claude.
 * Ergebnis je PR in der Datei aus KONFLIKT_FILE (JSON): "resolved" | "code" | "error".
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { main as writeDecisionsIndex } from "../decisions-index.mjs";
import { gh } from "./status.mjs";

/** Erzeugte Dateien: nie von Hand bearbeitet, daher ohne KI lösbar. */
export const INDEX_FILE = "docs/DECISIONS.md";
export const CHANGELOG_FILE = "CHANGELOG.md";
export const GENERATED_FILES = [INDEX_FILE, CHANGELOG_FILE];

/** true, wenn die Konfliktliste nicht leer ist und nur aus erzeugten Dateien besteht. */
export const onlyGenerated = (files) => files.length > 0 && files.every((f) => GENERATED_FILES.includes(f));

const defaultGit = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const defaultRegen = (cwd) => {
  if (writeDecisionsIndex([], cwd) !== 0) throw new Error("Index nicht erzeugt");
};

/**
 * Merged `base` in den ausgecheckten Branch in `cwd`.
 * @returns {"merged"|"resolved"|"code"} merged: kein Konflikt; resolved: nur erzeugte Dateien, Merge-Commit angelegt;
 *   code: echter Konflikt, der Merge ist abgebrochen und der Branch unverändert.
 */
export function resolveGeneratedConflicts({ cwd, base = "origin/main", git = defaultGit, regen = defaultRegen, keepCode = false, message = "chore: main einmergen, erzeugte Dateien neu erzeugt (SIN-312)" }) {
  try {
    git(cwd, ["merge", "--no-edit", base]);
    return "merged";
  } catch {
    const files = git(cwd, ["diff", "--name-only", "--diff-filter=U"]).split("\n").map((s) => s.trim()).filter(Boolean);
    if (!onlyGenerated(files)) {
      if (!keepCode) git(cwd, ["merge", "--abort"]); // keepCode: der Merge bleibt offen, die Reparatur löst ihn
      return "code";
    }
    for (const f of files) {
      if (f === INDEX_FILE) regen(cwd);
      else git(cwd, ["checkout", "--theirs", "--", f]); // CHANGELOG.md: Stand von main
    }
    git(cwd, ["add", "--", ...files]);
    git(cwd, ["commit", "--no-edit", "-m", message]);
    return "resolved";
  }
}

/** Offene Agenten-PRs mit Konflikt: bei jedem klonen, lösen, pushen. */
export async function resolveOpenPrs({ repo, token, dry = false, call = (path) => gh(path, { token }), git = defaultGit, regen = defaultRegen }) {
  const results = {};
  const list = await call(`/repos/${repo}/pulls?state=open&per_page=100`);
  for (const p of list.filter((x) => !x.draft && /^(claude|cursor)\//.test(x.head?.ref ?? "") && x.head.repo?.full_name === repo)) {
    const pr = await call(`/repos/${repo}/pulls/${p.number}`);
    if (pr.mergeable_state !== "dirty") continue;
    const dir = mkdtempSync(join(tmpdir(), "konflikt-"));
    try {
      git(dir, ["clone", "--quiet", `https://x-access-token:${token}@github.com/${repo}.git`, "."]);
      git(dir, ["config", "user.name", "claude[bot]"]);
      git(dir, ["config", "user.email", "claude[bot]@users.noreply.github.com"]);
      git(dir, ["checkout", "--quiet", p.head.ref]);
      const r = resolveGeneratedConflicts({ cwd: dir, git, regen });
      if (r === "resolved" && !dry) git(dir, ["push", "--quiet", "origin", `HEAD:${p.head.ref}`]);
      results[p.number] = r === "merged" ? "resolved" : r;
    } catch (e) {
      console.log(`PR #${p.number}: ${String(e.message).replaceAll(token, "***").slice(0, 300)}`);
      results[p.number] = "error";
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    console.log(`PR #${p.number}: ${results[p.number]}${dry ? " (dry-run, nichts gepusht)" : ""}`);
  }
  return results;
}

async function run(argv, env = process.env) {
  // --local: main in den ausgecheckten Branch (cwd) mergen, für repair.yml. Code-Konflikte bleiben offen.
  if (argv.includes("--local")) {
    const r = resolveGeneratedConflicts({ cwd: process.cwd(), keepCode: true });
    console.log(`main einmergen: ${r}`);
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `result=${r}\n`);
    return;
  }
  const repo = env.GITHUB_REPOSITORY;
  const token = env.GH_TOKEN;
  if (!repo || !token) throw new Error("GITHUB_REPOSITORY und GH_TOKEN nötig");
  const results = await resolveOpenPrs({ repo, token, dry: argv.includes("--dry-run") });
  if (env.KONFLIKT_FILE) writeFileSync(env.KONFLIKT_FILE, JSON.stringify(results));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).catch((e) => {
    // Nie den Wächter blockieren: ohne Ergebnis fragt er wie bisher @claude.
    console.log(`::warning::Konflikt-Auflösung fehlgeschlagen: ${e.message}`);
  });
}
