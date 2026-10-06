/**
 * Production-Deploys bündeln (SIN-266): `main` baut auf Vercel nie von selbst (scripts/vercel-ignore.sh).
 * Der Status-Wächter löst Production über den Vercel Deploy Hook aus: höchstens 1× pro Stunde (bei Vercel ≥ 90 %
 * höchstens alle 3 h) und nur, wenn seit dem letzten Production-Deploy App-Code gemergt wurde.
 * Reine Funktionen plus dünne Netz-Helfer; die Hook-URL (Secret VERCEL_DEPLOY_HOOK_PROD) wird nie ausgegeben.
 */
import { fetchJson } from "./http.mjs";

export const DEPLOY_INTERVAL_H = 1;
export const DEPLOY_INTERVAL_SLOW_H = 3;
export const SLOW_FROM_PCT = 90;
const HOUR_MS = 3600 * 1000;

/** Nur Doku, CI, Tests und Autonomie-Skripte: gleiche Ausnahmen wie scripts/vercel-ignore.sh. */
const NO_APP = [/^docs\//, /\.md$/, /^\.github\//, /^e2e\//, /^scripts\/autonomy\//, /^scripts\/decisions-index\.mjs$/, /\.test\.[^/]+$/, /^playwright\.config\.ts$/];

/** Ändert diese Datei, was auf Production läuft? */
export const isAppCodePath = (path) => !NO_APP.some((re) => re.test(path));

/** Abstand zwischen zwei Production-Deploys in Stunden. */
export const deployIntervalH = (vercelPct) => (typeof vercelPct === "number" && vercelPct >= SLOW_FROM_PCT ? DEPLOY_INTERVAL_SLOW_H : DEPLOY_INTERVAL_H);

/**
 * @param {{ now?: Date, lastDeployAt?: string | null, changedFiles?: string[] | null, vercelPct?: number | null }} input
 *   lastDeployAt null = unbekannt (kein Auslösen); changedFiles = Dateien der Merges seit dem letzten Deploy.
 * @returns {{ deploy: boolean, reason: string, intervalH: number, lastAt: string | null, nextAt: string | null, pending: number }}
 */
export function decideDeploy({ now = new Date(), lastDeployAt = null, changedFiles = null, vercelPct = null }) {
  const intervalH = deployIntervalH(vercelPct);
  const last = lastDeployAt ? new Date(lastDeployAt) : null;
  const known = last !== null && Number.isFinite(last.getTime());
  const nextAt = known ? new Date(last.getTime() + intervalH * HOUR_MS).toISOString() : null;
  const base = { intervalH, lastAt: known ? last.toISOString() : null, nextAt };
  const files = changedFiles ? changedFiles.filter(isAppCodePath) : null;
  const pending = files ? files.length : 0;
  if (!known) return { ...base, deploy: false, reason: "letzter Production-Deploy nicht lesbar", pending };
  if (!files) return { ...base, deploy: false, reason: "gemergte Änderungen nicht lesbar", pending };
  if (!files.length) return { ...base, deploy: false, reason: "kein App-Code seit dem letzten Deploy", pending };
  if (now.getTime() < new Date(nextAt).getTime()) return { ...base, deploy: false, reason: `Abstand ${intervalH} h noch nicht erreicht`, pending };
  return { ...base, deploy: true, reason: `${files.length} App-Datei(en) seit dem letzten Deploy`, pending };
}

const hhmm = (iso) => (iso ? `${iso.slice(11, 16)} UTC` : "unbekannt");

/** Zeile für die Status-Seite. */
export function renderDeploy(d) {
  if (!d) return "";
  const wait = d.pending ? `, ${d.pending} App-Datei(en) warten` : "";
  return `- Production-Deploy: letzter ${hhmm(d.lastAt)}, nächster frühestens ${hhmm(d.nextAt)} (${d.deploy ? "wird jetzt ausgelöst" : d.reason}${wait})`;
}

/** Letzter Production-Deploy (createdAt als ISO) aus der Vercel-API, sonst null. */
/** @param {{ env?: Record<string, string | undefined>, fetchImpl?: typeof fetch }} [opts] */
export async function lastProductionDeployAt({ env = process.env, fetchImpl = fetch } = {}) {
  if (!env.VERCEL_TOKEN) return null;
  const q = new URLSearchParams({ target: "production", limit: "1", state: "READY" });
  if (env.VERCEL_PROJECT_ID) q.set("projectId", env.VERCEL_PROJECT_ID);
  if (env.VERCEL_TEAM_ID) q.set("teamId", env.VERCEL_TEAM_ID);
  const r = await fetchJson("Vercel", `https://api.vercel.com/v6/deployments?${q}`, { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` } }, { fetchImpl });
  const created = r.deployments?.[0]?.createdAt ?? r.deployments?.[0]?.created;
  return created ? new Date(created).toISOString() : null;
}

/** Dateien aller Commits auf main seit `sinceIso` (Squash-Merge: ein Commit je PR). */
export async function changedFilesSince(repo, sinceIso, call) {
  const list = await call(`/repos/${repo}/commits?sha=main&since=${encodeURIComponent(sinceIso)}&per_page=100`);
  const files = new Set();
  for (const c of list) for (const f of (await call(`/repos/${repo}/commits/${c.sha}`)).files ?? []) files.add(f.filename);
  return [...files];
}

/** Löst den Hook aus. Gibt nur Erfolg oder Statuscode zurück, nie die URL. */
export async function triggerDeploy(hookUrl, fetchImpl = fetch) {
  const res = await fetchImpl(hookUrl, { method: "POST" });
  return res.ok ? { ok: true } : { ok: false, status: res.status };
}

/** Sammelt Stand und Entscheidung. Fehler (Token fehlt, API down) ergeben „nicht lesbar“, nie einen Abbruch. */
/** @param {{ env?: Record<string, string | undefined>, now?: Date, vercelPct?: number | null, call: (path: string) => Promise<any>, fetchImpl?: typeof fetch }} opts */
export async function planDeploy({ env = process.env, now = new Date(), vercelPct = null, call, fetchImpl = fetch }) {
  let lastDeployAt = null;
  let changedFiles = null;
  try {
    lastDeployAt = await lastProductionDeployAt({ env, fetchImpl });
    if (lastDeployAt && env.GITHUB_REPOSITORY) changedFiles = await changedFilesSince(env.GITHUB_REPOSITORY, lastDeployAt, call);
  } catch (e) {
    console.log(`Production-Deploy: nicht lesbar (${e.message})`);
  }
  return decideDeploy({ now, lastDeployAt, changedFiles, vercelPct });
}
