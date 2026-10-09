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
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { RUN_CAP_EUR } from "./duplicates.mjs";
import { fetchJson } from "./http.mjs";

export const RESULT_DIR = "docs/quality/runs";
export const READINESS_FILE = "docs/product-readiness.json";
export const MIGRATIONS_DIR = "supabase/migrations";
/** Bericht der Sicherheits-Stichprobe (SIN-272/SIN-404), wird vom Lauf geschrieben und mit dem Ergebnis-PR abgelegt. */
export const SAFETY_REPORT = "docs/quality/sicherheits-stichprobe-maf-metall.md";
/** Sicherung darf höchstens so alt sein, bevor `migrate` schreibt (SIN-293: täglich). */
export const MAX_BACKUP_AGE_H = 36;

const need = (...names) => names;
const LIVE = need("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

/**
 * Feste Liste. `check`: Produktreife-Punkt, den das Ergebnis belegt. `paid`: kostet API-Geld (höchstens 1 Lauf je Task und Tag).
 * `mensch`: Der Lauf liefert nur Messwerte; die Bestätigung setzt ein Mensch (SIN-338), daher nur `gelaufen`, nie `bestaetigt`.
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
    label: "Goldset-Vergleich Haiku 5.5 gegen Sonnet 5.5 (20 LF3-Einheiten, inkl. Reparatur, unter 3 €)",
    paid: true,
    secrets: need("ANTHROPIC_API_KEY", "OPENAI_API_KEY"),
    steps: [["npm", ["run", "ap22:ab"]]],
  },
  // SIN-437: alle Kandidaten (Claude und OpenAI), zwei Richter, Deckel 6 €. Trockenlauf zeigt Kandidaten und Kostenschätzung.
  "ab-alle-modelle": {
    label: "Goldset-Vergleich aller Modelle: Haiku 5.5, Sonnet 5.5, gpt-6-luna, gpt-6.1-sol, chat-latest (20 LF3-Einheiten, zwei Richter, Deckel 6 €)",
    paid: true,
    secrets: need("ANTHROPIC_API_KEY", "OPENAI_API_KEY"),
    steps: [["npm", ["run", "ap22:alle"]]],
    dryStep: ["npm", ["run", "ap22:alle:dry"]],
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
  // SIN-404: Stichprobe gegen die Live-App (SIN-272/SIN-278). Liest nur die öffentliche Route /api/learner/phase-a, kein Secret nötig.
  "safety-sample": {
    label: "Sicherheits-Stichprobe MAF Metall gegen die Live-App (Quelle und Abrufdatum)",
    check: "content-safety",
    mensch: true,
    secrets: [],
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

/** Ein Lauf, der in weniger als 3 Minuten scheitert, hat nichts verbraucht (z. B. API lehnt ab, SIN-444). */
export const QUICK_FAIL_SEC = 180;
/** Höchstens so viele schnelle Fehlschläge je Aufgabe und Tag, dann greift der Deckel trotzdem. */
export const MAX_QUICK_FAILS = 3;

const quickFail = (r) =>
  r.conclusion === "failure" &&
  Boolean(r.run_started_at && r.updated_at) &&
  (Date.parse(String(r.updated_at)) - Date.parse(String(r.run_started_at))) / 1000 < QUICK_FAIL_SEC;

/**
 * Höchstens 1 kostenpflichtiger Lauf je Aufgabe und Tag (UTC). Zählt laufende, erfolgreiche und lange gescheiterte Läufe,
 * keine abgebrochenen. Schnelle Fehlschläge (unter 3 Minuten) zählen erst ab dem dritten am Tag (SIN-444).
 * @param {{ display_title?: string, created_at?: string, run_started_at?: string, updated_at?: string, conclusion?: string | null, id?: number }[]} runs
 */
export function dailyLimitReached(task, runs, now = new Date(), /** @type {number | null} */ selfId = null) {
  if (!isPaid(task)) return false;
  const today = now.toISOString().slice(0, 10);
  const mine = runs.filter(
    (r) =>
      r.id !== selfId &&
      r.display_title === runTitle(task) &&
      String(r.created_at ?? "").startsWith(today) &&
      r.conclusion !== "cancelled" &&
      r.conclusion !== "skipped",
  );
  const quick = mine.filter(quickFail).length;
  return mine.length > quick || quick >= MAX_QUICK_FAILS;
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
export const REQUIRED_TABLES = ["pipeline_run_costs", "content_factory_runs", "question_evaluations", "judge_runs"];

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

/** SQL, das eine angewendete Migration in die Versionstabelle einträgt (doppelte Version: ignorieren). Name nur aus [a-z0-9_]. */
export function recordVersionSql(fileName) {
  const [version, ...rest] = fileName.replace(/\.sql$/, "").split("_");
  if (!/^\d{14}$/.test(version) || !/^[a-z0-9_]*$/.test(rest.join("_"))) throw new Error(`Ungültiger Migrationsname: ${fileName}`);
  return `insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${rest.join("_")}') on conflict (version) do nothing`;
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
    // Version eintragen (SIN-374), damit `supabase_migrations.schema_migrations` und der Wächter den Stand kennen.
    // Schlägt das fehl, bricht der Lauf ab (rot), statt eine angewendete, aber nicht eingetragene Migration still zu übergehen.
    await sqlQuery(env, recordVersionSql(p.name));
  }
  // Schema-Cache von PostgREST neu laden (SIN-351): sonst antwortet die REST-Schnittstelle trotz vorhandener Tabelle mit 404.
  if (!dry) await sqlQuery(env, "notify pgrst, 'reload schema'");
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
  const def = TASKS[task];
  const check = def?.check;
  if (!check) return file;
  const next = structuredClone(file);
  if (def.mensch) {
    // Messwert ohne Bestätigung: „gelaufen“ (Stufe unter Ziel), nie „bestaetigt“.
    next.gelaufen = { ...next.gelaufen, [check]: { datum, beleg, ergebnis: result.ergebnis } };
    return next;
  }
  if (typeof result.ok !== "boolean") return file;
  if (result.ok) {
    next.bestaetigt = { ...next.bestaetigt, [check]: { datum, beleg: `${beleg}: ${result.ergebnis}` } };
    if (next.gelaufen) delete next.gelaufen[check];
  } else {
    next.gelaufen = { ...next.gelaufen, [check]: { datum, beleg, ergebnis: result.ergebnis } };
  }
  return next;
}

// ---- Lauf ----------------------------------------------------------------------------------------------------

/**
 * Letzte aussagekräftige Zeile einer Ausgabe für eine `::error::`-Anmerkung (SIN-440). Agenten können Lauf-Logs nicht
 * lesen, Anmerkungen schon. Bevorzugt Zeilen mit Fehlerwort oder HTTP-Status, sonst die letzte Zeile. Schlüssel maskiert.
 * @param {string} text
 */
export function lastErrorLine(text = "") {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !/^npm (ERR!|error) (code|path|command|workingdir|A complete log)/i.test(l));
  const hit = [...lines].reverse().find((l) => /error|fehler|stop|failed|exception|status \d{3}|\b[45]\d\d\b/i.test(l));
  const line = hit ?? lines.at(-1) ?? "keine Ausgabe";
  return line
    .replace(/(sk-[a-z]*-?)[A-Za-z0-9_-]{8,}/g, "$1…")
    .replace(/(Bearer\s+)\S+/gi, "$1…")
    .replace(/::/g, ": ")
    .slice(0, 300);
}

function sh(cmd, args) {
  // Ausgabe durchreichen und mitschreiben, damit bei Fehler die Ursache als Anmerkung erscheint (SIN-440).
  const r = spawnSync(cmd, args, { env: process.env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) console.log(`::error title=${cmd} ${args.join(" ")}::${lastErrorLine(`${r.stdout ?? ""}\n${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}`)}`);
  return r.status === 0;
}

/**
 * Sicherheits-Stichprobe (SIN-404): startet scripts/safety-sample.mjs gegen die Live-App (URL aus docs/autonomy/config.json).
 * Befunde sind ein Ergebnis, kein Fehler: Der Lauf gilt als durchgelaufen, sobald die Anzahlen geschrieben sind.
 * Ohne Anzahlen (App nicht erreichbar, Skriptfehler) steht der Grund im Ergebnis.
 */
export function safetySample(datum, { dry = false } = {}) {
  const zahlen = `${RESULT_DIR}/safety-sample-${datum}-zahlen.json`;
  if (dry) return { ok: null, ergebnis: `Trockenlauf: node --import tsx scripts/safety-sample.mjs --live --json ${zahlen}` };
  mkdirSync(RESULT_DIR, { recursive: true });
  rmSync(zahlen, { force: true });
  spawnSync("node", ["--import", "tsx", "scripts/safety-sample.mjs", "--live", "--json", zahlen], { stdio: "inherit", env: process.env });
  if (!existsSync(zahlen)) {
    return { ok: null, durchgelaufen: false, ergebnis: "Nicht gelaufen: die Stichprobe hat keine Anzahlen geschrieben (App nicht erreichbar oder Skriptfehler, siehe Log)" };
  }
  const z = JSON.parse(readFileSync(zahlen, "utf8"));
  return {
    ok: null,
    durchgelaufen: true,
    zahlen: z,
    ergebnis: `${z.gezogen} von ${z.sicherheitsrelevant} sicherheitsrelevanten Einheiten geprüft (Seed ${z.seed}), ${z.befunde} mit Befund (Quelle oder Abrufdatum). Bestätigung durch einen Menschen offen (SIN-338)`,
  };
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
  else if (task === "safety-sample") result = safetySample(datum, { dry });
  else {
    const steps = def.steps.map(([cmd, args]) => [cmd, args.map((a) => a.replaceAll("{out}", out))]);
    mkdirSync(RESULT_DIR, { recursive: true });
    if (dry) {
      // `dryStep`: kostenloser Probelauf (zeigt z. B. Kandidaten und Kostenschätzung); Fehler macht den Trockenlauf rot.
      const probe = def.dryStep ? sh(def.dryStep[0], def.dryStep[1]) : true;
      result = { ok: null, ergebnis: `Trockenlauf${probe ? "" : " (Probelauf fehlgeschlagen)"}: ${steps.map(([c, a]) => `${c} ${a.join(" ")}`).join(" && ")}`, ...(probe ? {} : { durchgelaufen: false }) };
    }
    else {
      const ran = steps.every(([cmd, args]) => sh(cmd, args));
      // Exit-Code 0 = Ziel erreicht. Rot kann Ziel verfehlt oder Infrastruktur heißen: kein Eintrag, der Lauf wird rot und ein Mensch liest das Log.
      result = { ok: ran && def.check ? true : null, ergebnis: ran ? `${def.label}: bestanden` : `${def.label}: Ziel nicht erreicht oder Fehler (siehe Log)`, durchgelaufen: ran };
    }
  }
  return { ...base, ...result };
}

/** Pfade, die der Lauf ablegen darf (SIN-397). */
export const RESULT_PATHS = [RESULT_DIR, "docs/ops/ap22-runs", READINESS_FILE, SAFETY_REPORT];

/**
 * Ergebnisdateien vormerken. `git add a b c` bricht komplett ab, sobald ein Pfad fehlt (SIN-397: `docs/ops/ap22-runs`
 * gibt es nur bei `migrate`), daher nur vorhandene Pfade. Liefert, ob etwas zu committen ist, und den Grund.
 */
export function stageResult({ cwd = ".", paths = RESULT_PATHS } = {}) {
  const git = (...args) => spawnSync("git", args, { cwd, encoding: "utf8" });
  const present = paths.filter((p) => existsSync(`${cwd}/${p}`));
  if (!present.length) return { changed: false, grund: `Keine Ergebnisdatei vorhanden (${paths.join(", ")}): die Aufgabe hat nichts geschrieben.` };
  const add = git("add", "--", ...present);
  if (add.status !== 0) return { changed: false, grund: `git add fehlgeschlagen: ${add.stderr.trim()}` };
  const staged = git("diff", "--cached", "--name-only", "--", ...present).stdout.trim().split("\n").filter(Boolean);
  if (!staged.length) return { changed: false, grund: `Ergebnisdateien (${present.join(", ")}) sind identisch mit dem Stand auf main: nichts zu committen.` };
  return { changed: true, grund: `Geändert: ${staged.join(", ")}` };
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
  if (argv.includes("--stage")) {
    const r = stageResult();
    const line = r.changed ? r.grund : `**Kein Ergebnis-PR:** ${r.grund}`;
    console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${r.changed}\n`);
    return;
  }
  const task = argv[argv.indexOf("--task") + 1];
  const dry = argv.includes("--dry-run");
  const result = await runTask(task, { dry });
  const file = dry ? null : writeResult(result);
  const line = `**${result.label}** (${result.datum}): ${result.ergebnis}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n${result.lauf}\n`);
  if (!dry && TASKS[task].check && (result.ok !== null || TASKS[task].mensch)) {
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
