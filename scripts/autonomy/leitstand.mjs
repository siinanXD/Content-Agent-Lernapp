#!/usr/bin/env node
/**
 * Leitstand-Ereignisse (SIN-303): Start/Ende der Loop-Schritte als Zeilen in Supabase `loop_events`, dazu der
 * Schnappschuss `loop_snapshot` (Kontingente, Schlange, offene PRs). Für alle Repos gleich: nur Umgebungsvariablen,
 * keine Repo-Namen im Code (Projekt = GITHUB_REPOSITORY ohne Besitzer).
 *
 *   node scripts/autonomy/leitstand.mjs ereignis --schritt worker --status start|ok|fehler|uebersprungen
 *        [--issue SIN-1] [--pr 12] [--seit <ms seit 1970>] [--file <execution_file> (mehrfach)]
 *
 * Nie ein Fehlerabbruch: fehlen Secrets oder Netz, steht nur eine Warnung im Log (Messen darf den Lauf nicht kippen).
 * Braucht SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY. Keine Personendaten, keine Prompts.
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fetchJson } from "./http.mjs";
import { usageFromExecution } from "./sparen.mjs";

export const STEPS = ["dispatch", "worker", "pr-gate", "planner", "digest", "status"];
export const STATUSES = ["start", "ok", "fehler", "uebersprungen"];

/** Projektname: LEITSTAND_PROJEKT, sonst der Teil nach dem „/“ in GITHUB_REPOSITORY. */
export function projectOf(env = process.env) {
  return env.LEITSTAND_PROJEKT || String(env.GITHUB_REPOSITORY ?? "").split("/").pop() || "";
}

/** Summe mehrerer Läufe (Worker: Versuch 1 + 2); null, wenn keiner lesbar war. */
export function sumUsage(list) {
  const all = list.filter(Boolean);
  if (!all.length) return null;
  const add = (k) => all.reduce((n, u) => n + (u[k] ?? 0), 0);
  const some = (k) => all.some((u) => u[k] != null);
  return {
    input: add("input"),
    output: add("output"),
    cacheRead: add("cacheRead"),
    cacheWrite: add("cacheWrite"),
    turns: some("turns") ? add("turns") : null,
    durationMs: some("durationMs") ? add("durationMs") : null,
    costUsd: some("costUsd") ? add("costUsd") : null,
  };
}

const int = (x) => (x !== "" && x != null && Number.isFinite(Number(x)) ? Math.round(Number(x)) : null);

/**
 * Baut eine Ereigniszeile. Wirft bei unbekanntem Schritt oder Status (Tippfehler im Workflow sollen auffallen).
 * @param {{ schritt: string, status: string, issue?: string, pr?: number | string, seit?: number | string, usage?: ReturnType<typeof usageFromExecution> }} a
 */
export function buildEvent(a, env = process.env, now = Date.now()) {
  if (!STEPS.includes(a.schritt)) throw new Error(`Unbekannter Schritt „${a.schritt}“ (erlaubt: ${STEPS.join(", ")})`);
  if (!STATUSES.includes(a.status)) throw new Error(`Unbekannter Status „${a.status}“ (erlaubt: ${STATUSES.join(", ")})`);
  const project = projectOf(env);
  if (!project) throw new Error("Projekt unbekannt: GITHUB_REPOSITORY oder LEITSTAND_PROJEKT setzen");
  const repo = env.GITHUB_REPOSITORY;
  const runId = env.GITHUB_RUN_ID;
  const seit = int(a.seit);
  const u = a.usage ?? null;
  return {
    project,
    step: a.schritt,
    issue: a.issue || null,
    pr: int(a.pr),
    status: a.status,
    run_id: runId || null,
    run_url: repo && runId ? `${env.GITHUB_SERVER_URL ?? "https://github.com"}/${repo}/actions/runs/${runId}` : null,
    duration_ms: a.status === "start" ? null : seit != null ? Math.max(0, now - seit) : (u?.durationMs ?? null),
    input_tokens: u ? u.input : null,
    output_tokens: u ? u.output : null,
    cache_read_tokens: u ? u.cacheRead : null,
    cache_write_tokens: u ? u.cacheWrite : null,
    cost_usd: u?.costUsd ?? null,
  };
}

function headers(env, extra = {}) {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...extra };
}

const missingSecrets = (env) => ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !env[k]);

/** Schreibt ein Ereignis. Liefert `{ ok, grund }`, wirft nie. */
export async function sendEvent(event, env = process.env, http = {}) {
  const missing = missingSecrets(env);
  if (missing.length) return { ok: false, grund: `Secret fehlt: ${missing.join(", ")}` };
  try {
    // `return=representation`: PostgREST antwortet sonst mit leerem Body, und fetchJson verlangt JSON (Wiederholungen ohne Grund).
    await fetchJson("Supabase", `${env.SUPABASE_URL}/rest/v1/loop_events`, { method: "POST", headers: headers(env, { Prefer: "return=representation" }), body: JSON.stringify(event) }, http);
    return { ok: true };
  } catch (e) {
    return { ok: false, grund: e.message };
  }
}

/**
 * Schnappschuss je Projekt (überschreibt die Zeile): Kontingente, Schlange, offene PRs.
 * @param {{ quotas?: object[], queue?: object, openPrs?: object[] }} s
 */
export function buildSnapshot(s, env = process.env, now = new Date()) {
  return { project: projectOf(env), quotas: s.quotas ?? [], queue: s.queue ?? {}, open_prs: s.openPrs ?? [], updated_at: now.toISOString() };
}

export async function sendSnapshot(snapshot, env = process.env, http = {}) {
  const missing = missingSecrets(env);
  if (missing.length) return { ok: false, grund: `Secret fehlt: ${missing.join(", ")}` };
  if (!snapshot.project) return { ok: false, grund: "Projekt unbekannt" };
  try {
    await fetchJson(
      "Supabase",
      `${env.SUPABASE_URL}/rest/v1/loop_snapshot?on_conflict=project`,
      { method: "POST", headers: headers(env, { Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify(snapshot) },
      http,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, grund: e.message };
  }
}

export async function main(argv, env = process.env, http = {}) {
  const arg = (n, d = "") => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  if (argv[0] !== "ereignis") {
    console.log("::warning::Leitstand: Befehl „ereignis“ erwartet");
    return;
  }
  try {
    const files = argv.flatMap((a, i) => (a === "--file" && argv[i + 1] ? [argv[i + 1]] : []));
    const usage = sumUsage(files.filter((f) => existsSync(f)).map((f) => usageFromExecution(readFileSync(f, "utf8"))));
    const event = buildEvent({ schritt: arg("--schritt"), status: arg("--status"), issue: arg("--issue"), pr: arg("--pr"), seit: arg("--seit"), usage }, env);
    const r = await sendEvent(event, env, http);
    console.log(r.ok ? `Leitstand: ${event.step} ${event.status}${event.issue ? ` (${event.issue})` : ""} gespeichert` : `::warning::Leitstand: Ereignis nicht gespeichert (${r.grund})`);
  } catch (e) {
    console.log(`::warning::Leitstand: ${e.message}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => console.log(`::warning::${e.message}`));
}
