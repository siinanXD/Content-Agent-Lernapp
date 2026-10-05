#!/usr/bin/env node
/**
 * Vercel „Ignored Build Step“ (SIN-223, 3b): Hobby erlaubt 100 Deploys pro Tag.
 * Exit 0 = Build überspringen, Exit 1 = bauen. Bei jedem Fehler wird gebaut (fail open).
 *  - Preview nur für den letzten Commit eines Branches (ältere Commits eines PR überspringen).
 *  - Keine Deploys, wenn nur Doku geändert wurde (docs/, *.md, .github/).
 * Nutzt die öffentliche GitHub-API (Repo ist öffentlich); GITHUB_TOKEN optional gegen das Rate-Limit.
 */
import { pathToFileURL } from "node:url";
import { isDocsOnly } from "./budget.mjs";

const API = "https://api.github.com";

async function gh(path, fetchImpl) {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetchImpl(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

/** @returns {Promise<{ skip: boolean, reason: string }>} */
export async function decide(env = process.env, fetchImpl = fetch) {
  const { VERCEL_GIT_COMMIT_REF: ref, VERCEL_GIT_COMMIT_SHA: sha, VERCEL_GIT_REPO_OWNER: owner, VERCEL_GIT_REPO_SLUG: repo } = env;
  if (!ref || !sha || !owner || !repo) return { skip: false, reason: "Git-Angaben fehlen, bauen" };
  const base = `/repos/${owner}/${repo}`;
  const isMain = ref === "main";
  if (!isMain) {
    const head = await gh(`${base}/git/ref/heads/${ref.split("/").map(encodeURIComponent).join("/")}`, fetchImpl);
    if (head.object?.sha && head.object.sha !== sha) return { skip: true, reason: "nicht der letzte Commit des Branches" };
  }
  const data = await gh(isMain ? `${base}/commits/${sha}` : `${base}/compare/main...${sha}`, fetchImpl);
  const files = (data.files ?? []).map((f) => f.filename);
  const complete = isMain || files.length < 300;
  if (complete && isDocsOnly(files)) return { skip: true, reason: "nur Doku geändert" };
  return { skip: false, reason: "Code geändert" };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  decide()
    .then(({ skip, reason }) => {
      console.log(`${skip ? "Build übersprungen" : "Build läuft"}: ${reason}`);
      process.exit(skip ? 0 : 1);
    })
    .catch((e) => {
      console.log(`Build läuft (Prüfung fehlgeschlagen: ${e.message})`);
      process.exit(1);
    });
}
