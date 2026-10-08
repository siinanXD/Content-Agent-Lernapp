/**
 * Production-Deploys bündeln (SIN-266, SIN-309, SIN-332): Git-Deploys sind in vercel.json ausgeschaltet (`git.deploymentEnabled: false`);
 * nicht erstellte Deploys zählen nicht zum Hobby-Limit, abgebrochene schon. Der Status-Wächter startet den Workflow
 * `production-deploy.yml` (`vercel deploy --prod` per CLI, danach Smoke-Test im selben Lauf): höchstens 1× pro Stunde
 * (bei Vercel ≥ 90 % höchstens alle 3 h) und nur, wenn seit dem letzten Production-Deploy App-Code gemergt wurde.
 * Der Deploy Hook (SIN-266) erzeugte unter `deploymentEnabled: false` keinen Deploy und ist abgelöst (SIN-332).
 * Auslöse-Sperre (SIN-309): pro Commit höchstens ein Versuch; ein neuer erst bei neuem Commit oder nach 6 h. Endet der
 * Versuch CANCELED/ERROR, gibt es für diesen Commit keinen zweiten, sondern die Meldung „Production hängt“.
 * „Nicht lesbar“ und „Production liegt > 3 h hinter main“ sind Alarme (SIN-332), kein grauer Zustand.
 * Reine Funktionen plus dünne Netz-Helfer.
 */
import { fetchJson } from "./http.mjs";

export const DEPLOY_INTERVAL_H = 1;
export const DEPLOY_INTERVAL_SLOW_H = 3;
export const SLOW_FROM_PCT = 90;
export const RETRY_SAME_COMMIT_H = 6;
/** Liegt Production länger als so viele Stunden hinter main (App-Code), ist das ein roter Punkt (SIN-332). */
export const BEHIND_ALARM_H = 3;
const HOUR_MS = 3600 * 1000;
const FAILED = ["CANCELED", "ERROR"];

/** Nur Doku, CI, Tests und Autonomie-Skripte: kein App-Code. */
const NO_APP = [/^docs\//, /\.md$/, /^\.github\//, /^e2e\//, /^scripts\/autonomy\//, /^scripts\/decisions-index\.mjs$/, /\.test\.[^/]+$/, /^playwright\.config\.ts$/];

/** Ändert diese Datei, was auf Production läuft? */
export const isAppCodePath = (path) => !NO_APP.some((re) => re.test(path));

/** Abstand zwischen zwei Production-Deploys in Stunden. */
export const deployIntervalH = (vercelPct) => (typeof vercelPct === "number" && vercelPct >= SLOW_FROM_PCT ? DEPLOY_INTERVAL_SLOW_H : DEPLOY_INTERVAL_H);

/**
 * @typedef {{ sha: string, at: string, state?: string | null }} Attempt letzter Deploy-Versuch (Commit, Zeit, Ergebnis laut Vercel; null = noch offen)
 * @param {{ now?: Date, lastDeployAt?: string | null, changedFiles?: string[] | null, vercelPct?: number | null, headSha?: string | null, attempt?: Attempt | null }} input
 *   lastDeployAt null = unbekannt (kein Auslösen); changedFiles = Dateien der Merges seit dem letzten Deploy;
 *   headSha = Spitze von main; attempt = letzter Deploy-Versuch.
 * @returns {{ deploy: boolean, reason: string, intervalH: number, lastAt: string | null, nextAt: string | null, pending: number, stuck: { since: string, sha: string, state: string } | null }}
 */
export function decideDeploy({ now = new Date(), lastDeployAt = null, changedFiles = null, vercelPct = null, headSha = null, attempt = null }) {
  const intervalH = deployIntervalH(vercelPct);
  const last = lastDeployAt ? new Date(lastDeployAt) : null;
  const known = last !== null && Number.isFinite(last.getTime());
  const nextAt = known ? new Date(last.getTime() + intervalH * HOUR_MS).toISOString() : null;
  // „Hängt“: der letzte Versuch ist CANCELED/ERROR und seither kam kein READY-Deploy.
  const failedState = attempt && FAILED.includes(String(attempt.state)) ? String(attempt.state) : null;
  const stuck = attempt && failedState && (!known || last.getTime() < new Date(attempt.at).getTime()) ? { since: attempt.at, sha: attempt.sha, state: failedState } : null;
  const base = { intervalH, lastAt: known ? last.toISOString() : null, nextAt, stuck };
  const files = changedFiles ? changedFiles.filter(isAppCodePath) : null;
  const pending = files ? files.length : 0;
  if (!known) return { ...base, deploy: false, reason: "letzter Production-Deploy nicht lesbar", pending };
  if (!files) return { ...base, deploy: false, reason: "gemergte Änderungen nicht lesbar", pending };
  if (!files.length) return { ...base, deploy: false, reason: "kein App-Code seit dem letzten Deploy", pending };
  if (now.getTime() < new Date(nextAt).getTime()) return { ...base, deploy: false, reason: `Abstand ${intervalH} h noch nicht erreicht`, pending };
  // Auslöse-Sperre (SIN-309): pro Commit ein Versuch.
  if (attempt && headSha && attempt.sha === headSha) {
    const short = headSha.slice(0, 7);
    if (failedState) return { ...base, deploy: false, reason: `Versuch für ${short} war ${failedState}, kein neuer Versuch bis zum nächsten Commit`, pending };
    if (now.getTime() - new Date(attempt.at).getTime() < RETRY_SAME_COMMIT_H * HOUR_MS) {
      return { ...base, deploy: false, reason: `Versuch für ${short} schon gemacht (erneut erst nach ${RETRY_SAME_COMMIT_H} h oder bei neuem Commit)`, pending };
    }
  }
  return { ...base, deploy: true, reason: `${files.length} App-Datei(en) seit dem letzten Deploy`, pending };
}

const hhmm = (iso) => (iso ? `${iso.slice(11, 16)} UTC` : "unbekannt");

/** Zeilen für die Status-Seite: Live-Stand, Alarme, hängende Production, Takt. */
export function renderDeploy(d) {
  if (!d) return "";
  const wait = d.pending ? `, ${d.pending} App-Datei(en) warten` : "";
  const lines = [];
  if (d.live) lines.push(`- Live-Stand: Commit ${d.live.sha ? d.live.sha.slice(0, 7) : "unbekannt"} (${hhmm(d.live.at)}), main ist ${d.live.ahead} Merge(s) voraus`);
  if (d.unreadable) lines.push(`- 🔴 Production-Stand nicht lesbar: ${d.unreadable}`);
  if (d.behind) lines.push(`- 🔴 Production liegt seit ${hhmm(d.behind.since)} (${d.behind.hours} h) hinter main`);
  if (d.stuck) lines.push(`- ⚠️ Production hängt seit ${hhmm(d.stuck.since)} (Deploy für ${d.stuck.sha.slice(0, 7)}: ${d.stuck.state})`);
  lines.push(`- Production-Deploy: letzter ${hhmm(d.lastAt)}, nächster frühestens ${hhmm(d.nextAt)} (${d.deploy ? "wird jetzt ausgelöst" : d.reason}${wait})`);
  return lines.join("\n");
}

/**
 * Production-Deploys (neueste zuerst) aus der Vercel-API; ohne Token null. `state` filtert (z. B. READY): Der letzte
 * READY-Deploy steht nicht zwingend unter den letzten 20 Einträgen, wenn viele abgebrochen wurden (SIN-332).
 * @param {{ env?: Record<string, string | undefined>, fetchImpl?: typeof fetch, state?: string, limit?: number }} [opts]
 */
export async function productionDeploys({ env = process.env, fetchImpl = fetch, state, limit = 20 } = {}) {
  if (!env.VERCEL_TOKEN) return null;
  const q = new URLSearchParams({ target: "production", limit: String(limit) });
  if (state) q.set("state", state);
  if (env.VERCEL_PROJECT_ID) q.set("projectId", env.VERCEL_PROJECT_ID);
  if (env.VERCEL_TEAM_ID) q.set("teamId", env.VERCEL_TEAM_ID);
  const r = await fetchJson("Vercel", `https://api.vercel.com/v6/deployments?${q}`, { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` } }, { fetchImpl });
  return (r.deployments ?? []).map((d) => ({
    state: String(d.readyState ?? d.state ?? "").toUpperCase(),
    at: new Date(d.createdAt ?? d.created).toISOString(),
    sha: d.meta?.githubCommitSha ?? null,
  }));
}

/** Letzter READY-Production-Deploy (createdAt als ISO) aus der Vercel-API, sonst null. */
/** @param {{ env?: Record<string, string | undefined>, fetchImpl?: typeof fetch }} [opts] */
export async function lastProductionDeployAt(opts = {}) {
  return (await productionDeploys({ ...opts, state: "READY", limit: 1 }))?.find((d) => d.state === "READY")?.at ?? null;
}

/** Ergebnis eines Deploy-Versuchs: der erste Production-Deploy ab dem Versuch (2 min Toleranz), sonst null (noch offen). */
export function attemptState(attempt, deploys) {
  const from = new Date(attempt.at).getTime() - 120 * 1000;
  const first = [...deploys].reverse().find((d) => new Date(d.at).getTime() >= from);
  return first ? first.state : null;
}

/**
 * Dateien aller Commits auf main seit `sinceIso` (Squash-Merge: ein Commit je PR). `list` = schon gelesene Commits
 * (neueste zuerst). `info.oldestAppAt` bekommt das Datum des ältesten Commits mit App-Code (SIN-332).
 */
/** @param {string} repo @param {string} sinceIso @param {(path: string) => Promise<any>} call @param {any[] | null} [list] @param {{ oldestAppAt?: string }} [info] */
export async function changedFilesSince(repo, sinceIso, call, list = null, info = {}) {
  list ??= await call(`/repos/${repo}/commits?sha=main&since=${encodeURIComponent(sinceIso)}&per_page=100`);
  const files = new Set();
  for (const c of list) {
    const names = ((await call(`/repos/${repo}/commits/${c.sha}`)).files ?? []).map((f) => f.filename);
    for (const n of names) files.add(n);
    const at = c.commit?.committer?.date ?? c.commit?.author?.date;
    if (at && names.some(isAppCodePath) && (!info.oldestAppAt || at < info.oldestAppAt)) info.oldestAppAt = at;
  }
  return [...files];
}

/** Liegt Production länger als `BEHIND_ALARM_H` hinter main (App-Code wartet)? */
/** @param {{ now?: Date, oldestAppAt?: string | null, pending?: number }} input */
export function behindAlarm({ now = new Date(), oldestAppAt = null, pending = 0 }) {
  if (!pending || !oldestAppAt) return null;
  const hours = (now.getTime() - new Date(oldestAppAt).getTime()) / HOUR_MS;
  return hours > BEHIND_ALARM_H ? { since: new Date(oldestAppAt).toISOString(), hours: Math.floor(hours) } : null;
}

/** Startet den Workflow `production-deploy.yml` auf main. Gibt nur Erfolg oder Statuscode zurück, nie das Token. */
export async function triggerDeploy({ repo, token, fetchImpl = fetch }) {
  const res = await fetchImpl(`https://api.github.com/repos/${repo}/actions/workflows/production-deploy.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main" }),
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}

/** Sammelt Stand und Entscheidung. Fehler (Token fehlt, API down) ergeben „nicht lesbar“ (Alarm), nie einen Abbruch. */
/** @param {{ env?: Record<string, string | undefined>, now?: Date, vercelPct?: number | null, call: (path: string) => Promise<any>, fetchImpl?: typeof fetch, prevAttempt?: Attempt | null }} opts */
export async function planDeploy({ env = process.env, now = new Date(), vercelPct = null, call, fetchImpl = fetch, prevAttempt = null }) {
  let lastDeployAt = null;
  let changedFiles = null;
  let headSha = null;
  let live = null;
  let behind = null;
  let unreadable = null;
  let attempt = prevAttempt;
  try {
    if (!env.VERCEL_TOKEN) throw new Error("VERCEL_TOKEN fehlt");
    // Letzten READY-Deploy getrennt abfragen (SIN-332): unter den letzten 20 können nur abgebrochene stehen.
    const ready = (await productionDeploys({ env, fetchImpl, state: "READY", limit: 1 }))?.find((d) => d.state === "READY") ?? null;
    if (!ready) throw new Error("Vercel liefert keinen READY-Production-Deploy (Token, Team-Scope oder Projekt prüfen)");
    lastDeployAt = ready.at;
    const recent = await productionDeploys({ env, fetchImpl }).catch(() => null);
    if (attempt && recent) attempt = { ...attempt, state: attemptState(attempt, recent) ?? attempt.state ?? null };
    if (env.GITHUB_REPOSITORY) {
      const repo = env.GITHUB_REPOSITORY;
      headSha = (await call(`/repos/${repo}/commits/main`)).sha ?? null;
      const list = await call(`/repos/${repo}/commits?sha=main&since=${encodeURIComponent(ready.at)}&per_page=100`);
      const info = {};
      changedFiles = await changedFilesSince(repo, ready.at, call, list, info);
      live = { sha: ready.sha, at: ready.at, ahead: list.filter((c) => c.sha !== ready.sha).length };
      behind = behindAlarm({ now, oldestAppAt: info.oldestAppAt, pending: changedFiles.filter(isAppCodePath).length });
    }
  } catch (e) {
    unreadable = String(e.message);
    console.log(`Production-Deploy: nicht lesbar (${unreadable})`);
  }
  return { ...decideDeploy({ now, lastDeployAt, changedFiles, vercelPct, headSha, attempt }), live, headSha, attempt, behind, unreadable };
}
