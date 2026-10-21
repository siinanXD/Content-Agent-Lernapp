#!/usr/bin/env node
/**
 * Fabrik-Anstoß (SIN-807): Der GitHub-Cron von content-grow.yml feuert unzuverlässig (Läufe Stunden zu spät oder gar nicht).
 * Der Dispatcher (alle 30 Min) stößt die Fabrik deshalb selbst per workflow_dispatch an, wenn
 * - docs/FERTIG.md offene Content-Punkte hat,
 * - kein Lauf aktiv ist (laufend oder wartend),
 * - der letzte Lauf länger als 2 h her ist,
 * - keine Pause wegen leerem API-Guthaben aktiv ist (jüngster Eintrag in content_factory_runs).
 * Jeder Anstoß (auch ein gescheiterter, Status fehler) schreibt das Ereignis `fabrik-anstoss` in loop_events.
 *
 *   node scripts/autonomy/fabrik-anstoss.mjs [--dry-run]
 *
 * Braucht GITHUB_REPOSITORY, GITHUB_TOKEN (Läufe lesen), GH_TOKEN (Anstoß), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Nie ein Fehlerabbruch: Messen und Anstoßen dürfen den Dispatcher nicht kippen.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { main as leitstandEreignis } from "./leitstand.mjs";
import { PAUSE_PREFIX } from "./fabrik.mjs";
import { fetchJson } from "./http.mjs";

export const MIN_ABSTAND_MS = 2 * 60 * 60 * 1000;
const WORKFLOW = "content-grow.yml";

/** Wie `contentPunkteOffen` in src/lib/generate/content-grow.ts: offene Zeile zu Industriekaufmann oder Industriemechaniker. */
export const contentPunkteOffen = (md) => md.split("\n").some((l) => /^\s*- \[ \]/.test(l) && /Industriekaufmann|Industriemechaniker/i.test(l));

/**
 * @param {{ fertigMd: string, runs: { status: string, created_at: string }[], pausiert: boolean, fertig?: boolean, now?: number }} a
 * @returns {{ anstossen: boolean, grund: string }}
 */
export function entscheideAnstoss({ fertigMd, runs, pausiert, fertig = false, now = Date.now() }) {
  if (!contentPunkteOffen(fertigMd)) return { anstossen: false, grund: "keine offenen Content-Punkte in docs/FERTIG.md" };
  // SIN-901: Der letzte Lauf fand nichts mehr zu erzeugen; Veröffentlichen ist eine eigene Aufgabe. Weiter erst per Cron-Lauf oder von Hand.
  if (fertig) return { anstossen: false, grund: "fertig: alle Einheiten erzeugt (letzter Lauf), Fabrik still" };
  if (runs.some((r) => r.status !== "completed")) return { anstossen: false, grund: "ein Fabrik-Lauf ist aktiv oder wartet" };
  if (pausiert) return { anstossen: false, grund: "pausiert: API-Guthaben/Limit, weiter erst nach manuellem Start" };
  const letzter = Math.max(0, ...runs.map((r) => Date.parse(r.created_at)).filter(Number.isFinite));
  if (letzter && now - letzter < MIN_ABSTAND_MS) {
    return { anstossen: false, grund: `letzter Lauf vor ${Math.round((now - letzter) / 60000)} Min, Abstand 2 h noch nicht erreicht` };
  }
  return { anstossen: true, grund: letzter ? `letzter Lauf vor ${Math.round((now - letzter) / 60000)} Min` : "noch kein Lauf" };
}

const gh = (token) => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" });

async function fetchRuns(repo, token, http) {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/runs?per_page=10`;
  return ((await fetchJson("GitHub", url, { headers: gh(token) }, http)).workflow_runs ?? []).map((r) => ({ status: r.status, created_at: r.created_at }));
}

/** Jüngster Eintrag in content_factory_runs: pausiert (API-Limit) oder fertig (SIN-901, kein offenes Modul). */
async function fetchLetzterStopp(env, http) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const url = `${env.SUPABASE_URL}/rest/v1/content_factory_runs?select=stop_reason&order=started_at.desc&limit=1`;
  const rows = await fetchJson("Supabase", url, { headers: { apikey: key, Authorization: `Bearer ${key}` } }, http);
  const grund = String(rows?.[0]?.stop_reason ?? "");
  return { pausiert: grund.startsWith(PAUSE_PREFIX), fertig: grund.startsWith("fertig:") };
}

export async function main(argv, env = process.env, http = {}) {
  const dry = argv.includes("--dry-run");
  const repo = env.GITHUB_REPOSITORY;
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  try {
    if (!repo || !token) throw new Error("GITHUB_REPOSITORY oder Token fehlt");
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Secret fehlt: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    const fertigMd = readFileSync("docs/FERTIG.md", "utf8");
    // Offene Punkte zuerst prüfen: ohne sie braucht es weder Läufe noch Datenbank.
    const [runs, stopp] = contentPunkteOffen(fertigMd) ? await Promise.all([fetchRuns(repo, token, http), fetchLetzterStopp(env, http)]) : [[], {}];
    const { anstossen, grund } = entscheideAnstoss({ fertigMd, runs, ...stopp });
    console.log(`Fabrik-Anstoß: ${anstossen ? "ja" : "nein"} (${grund})`);
    if (!anstossen || dry) return { anstossen: false, grund };
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      headers: { ...gh(env.GH_TOKEN || token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }),
    });
    if (!res.ok) {
      const fehler = `Anstoß gescheitert: ${res.status} ${(await res.text()).slice(0, 80)}`;
      await leitstandEreignis(["ereignis", "--schritt", "fabrik-anstoss", "--status", "fehler", "--grund", fehler]);
      throw new Error(fehler);
    }
    await leitstandEreignis(["ereignis", "--schritt", "fabrik-anstoss", "--status", "ok", "--grund", grund]);
    return { anstossen: true, grund };
  } catch (e) {
    console.log(`::warning::Fabrik-Anstoß übersprungen: ${e.message}`);
    return { anstossen: false, grund: e.message };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2));
}
