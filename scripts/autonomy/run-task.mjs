#!/usr/bin/env node
/**
 * Lauf-Aufgaben mit Secrets (SIN-302). Wird nur vom Workflow `run-task.yml` gestartet.
 * Die Aufgaben stehen in einer festen Liste (TASKS); es gibt keinen freien Befehl.
 *
 * Aufruf: node scripts/autonomy/run-task.mjs --task <id> [--dry-run]
 * Ergebnis: docs/quality/runs/<task>-<Datum>.json und Zusammenfassung in $GITHUB_STEP_SUMMARY.
 * Der Exit-Code ist 0 nur, wenn der Lauf durchlief (Messwert unter Ziel ist ein Ergebnis, kein Fehler).
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { RUN_CAP_EUR } from "./duplicates.mjs";
import { fetchJson } from "./http.mjs";

export const RESULT_DIR = "docs/quality/runs";
export const READINESS_FILE = "docs/product-readiness.json";
export const MIGRATIONS_DIR = "supabase/migrations";
/** Sicherung darf höchstens so alt sein, bevor `migrate` schreibt (SIN-293: täglich). */
export const MAX_BACKUP_AGE_H = 36;

const need = (...names) => names;
const LIVE = need("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

/**
 * Feste Liste. `check`: Produktreife-Punkt, den das Ergebnis belegt. `paid`: kostet API-Geld (höchstens 1 Lauf je Task und Tag).
 * `steps`: Befehle ohne Shell.
 */
export const TASKS = {
  "judge-backfill": {
    label: "Bewertung aller veröffentlichten Fragen (Richter-Modell, Batch)",
    paid: true,
    secrets: LIVE,
    env: { COURSE_STORAGE: "supabase" },
    steps: [["npm", ["run", "quality:judge-backfill"]]],
  },
  "ab-haiku-sonnet": {
    label: "Goldset-Vergleich Haiku gegen Sonnet",
    paid: true,
    secrets: need("ANTHROPIC_API_KEY", "OPENAI_API_KEY"),
    steps: [["npm", ["run", "ap22:ab"]]],
  },
  "cost-report": {
    label: "Kosten pro Kurslauf aus dem Ledger",
    check: "betrieb-kosten",
    secrets: need("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"),
    steps: [],
  },
  lighthouse: {
    label: "Lighthouse über alle Screens (Median aus 3 Läufen)",
    check: "qual-lighthouse",
    steps: [["node", ["scripts/lighthouse-gate.mjs", "--serve", "--runs", "3", "--out", "{out}"]]],
    needsBuild: true,
  },
  "offline-check": {
    label: "Offline-Einheit und Service Worker, dreimal wiederholt",
    check: "qual-offline",
    steps: [["npx", ["playwright", "test", "e2e/offline.spec.ts", "e2e/service-worker.spec.ts", "--repeat-each=3"]]],
    needsBuild: true,
  },
  migrate: {
    label: "Fehlende additive Migrationen anwenden (nach Sicherung)",
    secrets: need("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF"),
    steps: [],
  },
};
export const TASK_IDS = Object.keys(TASKS);

export const isPaid = (task) => Boolean(TASKS[task]?.paid);

/** Fehlende Secret-Namen (nie Werte). */
export const missingSecrets = (task, /** @type {Record<string, string | undefined>} */ env = process.env) => (TASKS[task]?.secrets ?? []).filter((n) => !env[n]?.trim());

/** Workflow, der Aufgaben startet; der Lauf-Titel (`run-name`) trägt die Aufgabe, damit der Tagesdeckel sie findet. */
export const RUN_WORKFLOW = "run-task.yml";
export const runTitle = (task) => `Lauf ${task}`;

/** Lauf-Aufträge des Planers (SIN-292) → Aufgabe dieses Workflows. */
export const taskForCheck = (check) => TASK_IDS.find((t) => TASKS[t].check === check);

/**
 * Höchstens 1 kostenpflichtiger Lauf je Aufgabe und Tag (UTC). Zählt laufende und erfolgreiche Läufe, keine abgebrochenen.
 * @param {{ display_title?: string, created_at?: string, conclusion?: string | null, id?: number }[]} runs
 */
export function dailyLimitReached(task, runs, now = new Date(), /** @type {number | null} */ selfId = null) {
  if (!isPaid(task)) return false;
  const today = now.toISOString().slice(0, 10);
  return runs.some(
    (r) =>
      r.id !== selfId &&
      r.display_title === runTitle(task) &&
      String(r.created_at ?? "").startsWith(today) &&
      r.conclusion !== "cancelled" &&
      r.conclusion !== "skipped",
  );
}

async function ghRuns(repo, token, fetchImpl = fetch) {
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${RUN_WORKFLOW}/runs?per_page=50`;
  const data = await fetchJson("GitHub", url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }, { fetchImpl });
  return data.workflow_runs ?? [];
}

/**
 * Startet den Lauf-Workflow über das Agenten-Token (Planer, SIN-302). Ohne Token oder bei erreichtem Tagesdeckel: kein Start.
 * @returns {Promise<{ started: boolean, grund?: string }>}
 */
export async function dispatchRun(task, /** @type {{ env?: Record<string, string | undefined>, fetchImpl?: typeof fetch, now?: Date }} */ { env = process.env, fetchImpl = fetch, now = new Date() } = {}) {
  if (!TASKS[task]) throw new Error(`Unbekannte Aufgabe: ${task}`);
  const token = env.AGENT_WORKFLOW_TOKEN || env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPOSITORY;
  if (!token || !repo) return { started: false, grund: "kein Token oder Repository" };
  if (dailyLimitReached(task, await ghRuns(repo, token, fetchImpl), now)) return { started: false, grund: "heute schon gelaufen (höchstens 1 kostenpflichtiger Lauf je Aufgabe und Tag)" };
  const res = await fetchImpl(`https://api.github.com/repos/${repo}/actions/workflows/${RUN_WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ ref: env.RUN_REF || "main", inputs: { task } }),
  });
  if (!res.ok) return { started: false, grund: `GitHub HTTP ${res.status}` };
  return { started: true };
}

// ---- Kosten --------------------------------------------------------------------------------------------------

/** Auswertung der Ledger-Zeilen (pipeline_run_costs, neueste zuerst). `ok`: mindestens ein Lauf und keiner über dem Deckel. */
export function costResult(rows, capEur = RUN_CAP_EUR) {
  if (!rows.length) return { ok: null, ergebnis: "Ledger leer: noch kein Lauf gemessen" };
  const eur = rows.map((r) => Number(r.cost_eur ?? 0));
  const max = Math.max(...eur);
  const avg = eur.reduce((a, b) => a + b, 0) / eur.length;
  const stopped = rows.filter((r) => r.stopped).length;
  const kinds = [...new Set(rows.map((r) => r.kind))].join(", ");
  return {
    ok: max < capEur && stopped === 0,
    ergebnis: `${rows.length} Läufe (${kinds}): Ø ${avg.toFixed(2)} €, höchster ${max.toFixed(2)} € (Deckel ${capEur} €), ${stopped} gestoppt`,
  };
}

async function costReport(env, fetchImpl = fetch) {
  const url = `${env.SUPABASE_URL}/rest/v1/pipeline_run_costs?select=run_id,kind,cost_eur,stopped,created_at&order=created_at.desc&limit=200`;
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const rows = await fetchJson("Supabase", url, { headers }, { fetchImpl });
  return { ...costResult(rows), rows: rows.length };
}

// ---- Migrationen ---------------------------------------------------------------------------------------------

// Gleiche Muster wie das Risiko-Gate (scripts/autonomy/risk.mjs): was dort Datenverlust ist, wird hier nie angewendet.
const DATA_LOSS =
  /\b(drop\s+(table|column|schema|view|index|constraint|type|function|policy)|delete\s+from|truncate)\b|\balter\b[^;]*\b(drop|rename)\b/i;
const SECURITY_LOSS = /\bdisable\s+row\s+level\s+security\b|\bno\s+force\s+row\s+level\s+security\b/i;

/** SQL ohne Kommentare. */
export const stripSqlComments = (sql) => String(sql).replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/** Nur additive Migrationen: kein Löschen, Umbenennen oder Abschalten von RLS. */
export const isAdditive = (sql) => {
  const s = stripSqlComments(sql);
  return !DATA_LOSS.test(s) && !SECURITY_LOSS.test(s);
};

/** Tabellen, die eine Migration anlegt (`create table [if not exists] [public.]name`). */
export const createdTables = (sql) =>
  [...stripSqlComments(sql).matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)].map((m) => m[1].toLowerCase());

/**
 * Welche Migrationen fehlen? Eine Datei mit `create table` gilt als angewendet, wenn alle Tabellen existieren
 * (Supabase-Projekte werden teils von Hand befüllt, die Versionstabelle ist dann leer). Ohne `create table`
 * zählt die Versionstabelle `supabase_migrations.schema_migrations`.
 * @param {{ name: string, sql: string }[]} files nach Name sortiert
 */
export function pendingMigrations(files, { tables = new Set(), versions = new Set() } = {}) {
  return files
    .filter(({ name, sql }) => {
      const created = createdTables(sql);
      if (created.length) return !created.every((t) => tables.has(t));
      return !versions.has(name.split("_")[0]);
    })
    .map(({ name, sql }) => ({ name, sql, additiv: isAdditive(sql) }));
}

/** Tabellen, die nach `migrate` da sein müssen (SIN-347): Kosten-Ledger und Status der Content-Fabrik. */
export const REQUIRED_TABLES = ["pipeline_run_costs", "content_factory_runs"];

/** Welche der geforderten Tabellen fehlen? Reine Funktion über die Namen aus information_schema. */
export const missingTables = (present, required = REQUIRED_TABLES) => {
  const have = new Set(present);
  return required.filter((t) => !have.has(t));
};

/** Sicherung jünger als MAX_BACKUP_AGE_H? `lastBackupAt`: ISO-Zeit des letzten erfolgreichen Backup-Laufs. */
export const backupFresh = (lastBackupAt, now = new Date()) =>
  Boolean(lastBackupAt) && now.getTime() - new Date(lastBackupAt).getTime() <= MAX_BACKUP_AGE_H * 3600 * 1000;

async function sqlQuery(env, query, fetchImpl = fetch) {
  const url = `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`;
  return fetchJson(
    "Supabase",
    url,
    { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) },
    { fetchImpl },
  );
}

async function migrate(env, { dry }) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(`${MIGRATIONS_DIR}/${name}`, "utf8") }));
  const tables = new Set((await sqlQuery(env, "select table_name from information_schema.tables where table_schema = 'public'")).map((r) => r.table_name));
  const versions = new Set(
    await sqlQuery(env, "select version from supabase_migrations.schema_migrations")
      .then((rows) => rows.map((r) => r.version))
      .catch(() => []),
  );
  const pending = pendingMigrations(files, { tables, versions });
  const blocked = pending.filter((p) => !p.additiv);
  const todo = pending.filter((p) => p.additiv);
  const lines = [`Fehlend: ${pending.map((p) => p.name).join(", ") || "keine"}`];
  if (blocked.length) lines.push(`Nicht angewendet (nicht additiv, bleibt risk:high, Sinan entscheidet): ${blocked.map((p) => p.name).join(", ")}`);
  if (!dry && todo.length && !backupFresh(env.BACKUP_AT)) {
    return { ok: false, ergebnis: `${lines.join("; ")}. Abbruch: keine Sicherung der letzten ${MAX_BACKUP_AGE_H} h (BACKUP_AT leer oder zu alt)` };
  }
  const applied = [];
  for (const p of todo) {
    if (dry) continue;
    // Jede Migration in einer Transaktion; schlägt sie fehl, bleibt die Datenbank unverändert und der Lauf bricht ab.
    await sqlQuery(env, `begin;\n${p.sql}\ncommit;`);
    applied.push(p.name);
  }
  const after = dry ? null : await sqlQuery(env, "select table_name from information_schema.tables where table_schema = 'public'");
  lines.push(dry ? `Trockenlauf: würde anwenden: ${todo.map((p) => p.name).join(", ") || "nichts"}` : `Angewendet: ${applied.join(", ") || "nichts"} (${after.length} Tabellen)`);
  // Beleg im Log: nur Tabellennamen, keine Werte, keine Secrets.
  let fehlend = [];
  if (!dry) {
    fehlend = missingTables(after.map((r) => r.table_name));
    for (const t of REQUIRED_TABLES) console.log(`${fehlend.includes(t) ? "FEHLT" : "ok   "} ${t}`);
    lines.push(fehlend.length ? `Tabellen fehlen weiter: ${fehlend.join(", ")}` : `Tabellen vorhanden: ${REQUIRED_TABLES.join(", ")}`);
  }
  return { ok: blocked.length === 0 && fehlend.length === 0, ergebnis: lines.join("; "), applied, blocked: blocked.map((b) => b.name) };
}

// ---- Eintrag in docs/product-readiness.json ------------------------------------------------------------------

/**
 * Trägt ein Ergebnis in die Produktreife-Datei ein: erfüllt → `bestaetigt`, sonst `gelaufen`. Reine Funktion.
 * Ohne `check` oder ohne Messwert (`ok` nicht boolesch) bleibt die Datei unverändert.
 */
export function applyResult(file, task, result, { datum, beleg }) {
  const check = TASKS[task]?.check;
  if (!check || typeof result.ok !== "boolean") return file;
  const next = structuredClone(file);
  if (result.ok) {
    next.bestaetigt = { ...next.bestaetigt, [check]: { datum, beleg: `${beleg}: ${result.ergebnis}` } };
    if (next.gelaufen) delete next.gelaufen[check];
  } else {
    next.gelaufen = { ...next.gelaufen, [check]: { datum, beleg, ergebnis: result.ergebnis } };
  }
  return next;
}

// ---- Lauf ----------------------------------------------------------------------------------------------------

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  return r.status === 0;
}

/** @returns {Promise<Record<string, any>>} */
export async function runTask(task, /** @type {{ env?: Record<string, string | undefined>, dry?: boolean, now?: Date }} */ { env = process.env, dry = false, now = new Date() } = {}) {
  const def = TASKS[task];
  if (!def) throw new Error(`Unbekannte Aufgabe „${task}“. Erlaubt: ${TASK_IDS.join(", ")}`);
  const datum = now.toISOString().slice(0, 10);
  const out = `${RESULT_DIR}/${task}-${datum}.json`;
  const base = { task, label: def.label, datum, lauf: env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}` : "lokal" };
  const miss = missingSecrets(task, env);
  if (miss.length && !dry) return { ...base, ok: null, ergebnis: `Blocker: Secret fehlt (${miss.join(", ")}). Nichts ausgeführt.`, blocker: true };

  let result;
  if (task === "cost-report") result = await costReport(env);
  else if (task === "migrate") result = await migrate(env, { dry });
  else {
    const steps = def.steps.map(([cmd, args]) => [cmd, args.map((a) => a.replaceAll("{out}", out))]);
    mkdirSync(RESULT_DIR, { recursive: true });
    if (dry) result = { ok: null, ergebnis: `Trockenlauf: ${steps.map(([c, a]) => `${c} ${a.join(" ")}`).join(" && ")}` };
    else {
      const ran = steps.every(([cmd, args]) => sh(cmd, args));
      // Exit-Code 0 = Ziel erreicht. Rot kann Ziel verfehlt oder Infrastruktur heißen: kein Eintrag, der Lauf wird rot und ein Mensch liest das Log.
      result = { ok: ran && def.check ? true : null, ergebnis: ran ? `${def.label}: bestanden` : `${def.label}: Ziel nicht erreicht oder Fehler (siehe Log)`, durchgelaufen: ran };
    }
  }
  return { ...base, ...result };
}

function writeResult(result) {
  mkdirSync(RESULT_DIR, { recursive: true });
  const file = `${RESULT_DIR}/${result.task}-${result.datum}.json`;
  // Bei lighthouse steht dort schon die Messung; das Ergebnis kommt daneben.
  const target = existsSync(file) && result.task === "lighthouse" ? file.replace(/\.json$/, "-ergebnis.json") : file;
  writeFileSync(target, `${JSON.stringify(result, null, 2)}\n`);
  return target;
}

async function main(argv) {
  const task = argv[argv.indexOf("--task") + 1];
  const dry = argv.includes("--dry-run");
  const result = await runTask(task, { dry });
  const file = dry ? null : writeResult(result);
  const line = `**${result.label}** (${result.datum}): ${result.ergebnis}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n${result.lauf}\n`);
  if (!dry && result.ok !== null && TASKS[task].check) {
    const next = applyResult(JSON.parse(readFileSync(READINESS_FILE, "utf8")), task, result, { datum: result.datum, beleg: `Lauf ${result.lauf}${file ? `, Rohdaten ${file}` : ""}` });
    writeFileSync(READINESS_FILE, `${JSON.stringify(next, null, 2)}\n`);
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `blocker=${result.blocker ? "true" : "false"}\ndurchgelaufen=${result.blocker || result.durchgelaufen === false ? "false" : "true"}\n`);
  if (result.blocker) process.exitCode = 3;
  else if (result.durchgelaufen === false || (result.ok === false && task === "migrate")) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
