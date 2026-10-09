import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  REQUIRED_TABLES,
  missingTables,
  TASK_IDS,
  TASKS,
  applyResult,
  backupFresh,
  costResult,
  dailyLimitReached,
  dispatchRun,
  isAdditive,
  missingSecrets,
  pendingMigrations,
  runTask,
  safetySample,
  stageResult,
  taskForCheck,
} from "../../../scripts/autonomy/run-task.mjs";
import { startRuns } from "../../../scripts/autonomy/planner.mjs";

const now = new Date("2026-10-06T10:00:00Z");

test("missingTables: meldet fehlende Pflicht-Tabellen (SIN-347)", () => {
  assert.deepEqual(REQUIRED_TABLES, ["pipeline_run_costs", "content_factory_runs", "question_evaluations", "judge_runs"]);
  assert.deepEqual(missingTables(["courses", "pipeline_run_costs", "question_evaluations", "judge_runs"]), ["content_factory_runs"]);
  assert.deepEqual(missingTables(REQUIRED_TABLES), []);
});

test("ab-alle-modelle: bezahlt, beide Schlüssel nötig, Probelauf kostenlos (SIN-437)", () => {
  assert.equal(TASKS["ab-alle-modelle"].paid, true);
  assert.deepEqual(TASKS["ab-alle-modelle"].steps, [["npm", ["run", "ap22:alle"]]]);
  assert.deepEqual(TASKS["ab-alle-modelle"].dryStep, ["npm", ["run", "ap22:alle:dry"]]);
  assert.deepEqual(missingSecrets("ab-alle-modelle", {}), ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"]);
});

test("feste Liste: die fünf Messläufe und migrate, kein freier Befehl", async () => {
  assert.deepEqual(TASK_IDS, ["judge-backfill", "ab-haiku-sonnet", "ab-alle-modelle", "cost-report", "lighthouse", "offline-check", "migrate", "safety-sample"]);
  await assert.rejects(() => runTask("rm -rf /", { env: {}, now }), /Unbekannte Aufgabe/);
  const yml = readFileSync(".github/workflows/run-task.yml", "utf8");
  for (const id of TASK_IDS) assert.match(yml, new RegExp(`- ${id}\\n`));
});

test("fehlende Secrets: Blocker, nichts ausgeführt, keine Namen mit Werten", async () => {
  assert.deepEqual(missingSecrets("lighthouse", {}), []);
  assert.ok(missingSecrets("ab-haiku-sonnet", { ANTHROPIC_API_KEY: "x" }).includes("OPENAI_API_KEY"));
  const r = await runTask("ab-haiku-sonnet", { env: { ANTHROPIC_API_KEY: "geheim" }, now });
  assert.equal(r.blocker, true);
  assert.match(r.ergebnis, /OPENAI_API_KEY/);
  assert.doesNotMatch(JSON.stringify(r), /geheim/);
});

test("Tagesdeckel: ein kostenpflichtiger Lauf je Aufgabe und Tag", () => {
  const run = (title: string, created: string, conclusion: string | null = "success", id = 1) => ({ id, display_title: title, created_at: created, conclusion });
  assert.equal(dailyLimitReached("judge-backfill", [run("Lauf judge-backfill", "2026-10-06T06:00:00Z")], now), true);
  assert.equal(dailyLimitReached("judge-backfill", [run("Lauf judge-backfill", "2026-10-05T23:00:00Z")], now), false);
  assert.equal(dailyLimitReached("judge-backfill", [run("Lauf cost-report", "2026-10-06T06:00:00Z")], now), false);
  assert.equal(dailyLimitReached("judge-backfill", [run("Lauf judge-backfill", "2026-10-06T06:00:00Z", "cancelled")], now), false);
  assert.equal(dailyLimitReached("judge-backfill", [run("Lauf judge-backfill", "2026-10-06T06:00:00Z", null, 7)], now, 7), false);
  assert.equal(dailyLimitReached("lighthouse", [run("Lauf lighthouse", "2026-10-06T06:00:00Z")], now), false);
});

test("SIN-444: schnelle Fehlschläge (API lehnt ab) sperren den Tag nicht, ab dem dritten schon", () => {
  const run = (id: number, conclusion: string | null, start: string, end: string) => ({
    id,
    display_title: "Lauf ab-alle-modelle",
    created_at: start,
    run_started_at: start,
    updated_at: end,
    conclusion,
  });
  const quick = (id: number) => run(id, "failure", "2026-10-06T08:52:43Z", "2026-10-06T08:53:15Z");
  assert.equal(dailyLimitReached("ab-alle-modelle", [quick(1)], now), false);
  assert.equal(dailyLimitReached("ab-alle-modelle", [quick(1), quick(2)], now), false);
  assert.equal(dailyLimitReached("ab-alle-modelle", [quick(1), quick(2), quick(3)], now), true);
  // Lange gescheitert (Geld kann verbraucht sein) zählt wie ein Erfolg.
  assert.equal(dailyLimitReached("ab-alle-modelle", [run(4, "failure", "2026-10-06T08:00:00Z", "2026-10-06T08:30:00Z")], now), true);
  // Ohne Zeitstempel bleibt es beim alten Verhalten: zählt.
  assert.equal(dailyLimitReached("ab-alle-modelle", [{ id: 5, display_title: "Lauf ab-alle-modelle", created_at: "2026-10-06T08:00:00Z", conclusion: "failure" }], now), true);
  // Läuft noch: zählt.
  assert.equal(dailyLimitReached("ab-alle-modelle", [quick(1), run(6, null, "2026-10-06T09:00:00Z", "2026-10-06T09:00:30Z")], now), true);
});

test("dispatchRun startet nur ohne Treffer am Tag und über das Agenten-Token", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mk = (runs: unknown[]) => async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return init?.method === "POST" ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ workflow_runs: runs }), { status: 200 });
  };
  const env = { AGENT_WORKFLOW_TOKEN: "t", GITHUB_REPOSITORY: "o/r" };
  const ok = await dispatchRun("judge-backfill", { env, fetchImpl: mk([]) as unknown as typeof fetch, now });
  assert.equal(ok.started, true);
  const post = calls.find((c) => c.init?.method === "POST");
  assert.match(post!.url, /workflows\/run-task\.yml\/dispatches$/);
  assert.deepEqual(JSON.parse(String(post!.init!.body)), { ref: "main", inputs: { task: "judge-backfill" } });
  const again = await dispatchRun("judge-backfill", {
    env,
    fetchImpl: mk([{ id: 9, display_title: "Lauf judge-backfill", created_at: "2026-10-06T01:00:00Z", conclusion: "success" }]) as unknown as typeof fetch,
    now,
  });
  assert.equal(again.started, false);
  assert.equal((await dispatchRun("cost-report", { env: {}, now })).started, false);
});

test("Planer: gebaut, nicht gelaufen → Lauf starten statt Issue", async () => {
  const rows = [{ id: "qual-offline", stufe: "gebaut, nicht gelaufen" }, { id: "recht-impressum", stufe: "fehlt" }];
  const plan = [
    { title: "Offline prüfen", check: "qual-offline" },
    { title: "Impressum", check: "recht-impressum" },
    { title: "Anderes" },
  ];
  const started: string[] = [];
  const { rest, started: log } = await startRuns(plan, rows, { dispatch: async (t: string) => (started.push(t), { started: true }) });
  assert.deepEqual(started, ["offline-check"]);
  assert.deepEqual(rest.map((e: { title: string }) => e.title), ["Impressum", "Anderes"]);
  assert.equal(log[0].started, true);
  const dry = await startRuns(plan, rows, { dry: true, dispatch: async () => assert.fail("kein Start im Trockenlauf") });
  assert.equal(dry.started[0].started, false);
  assert.equal(taskForCheck("betrieb-kosten"), "cost-report");
  assert.equal(taskForCheck("recht-impressum"), undefined);
});

test("Kosten: Deckel und leerer Ledger", () => {
  assert.equal(costResult([]).ok, null);
  const good = costResult([{ cost_eur: 4.5, kind: "judge-backfill" }, { cost_eur: 1, kind: "content" }]);
  assert.equal(good.ok, true);
  assert.match(good.ergebnis, /2 Läufe .*Ø 2\.75 €, höchster 4\.50 €/);
  assert.equal(costResult([{ cost_eur: 20, kind: "x", stopped: true }]).ok, false);
});

test("Migrationen: nur additive, fehlende nach Tabellen und Version", () => {
  assert.equal(isAdditive("create table if not exists public.a (id int); alter table public.a add column b int;"), true);
  assert.equal(isAdditive("-- drop table x\ncreate table a();"), true);
  for (const bad of ["drop table a;", "alter table a drop column b;", "alter table a rename to c;", "delete from a;", "truncate a;", "alter table a disable row level security;"]) {
    assert.equal(isAdditive(bad), false, bad);
  }
  const files = [
    { name: "20261006020000_a.sql", sql: "create table if not exists public.pipeline_run_costs (id int);\ncreate table if not exists public.judge_runs (id int);" },
    { name: "20261003030000_b.sql", sql: "create table if not exists public.courses (id int);" },
    { name: "20261008010000_c.sql", sql: "alter table public.courses add column x int;" },
    { name: "20261009010000_d.sql", sql: "drop table public.courses;" },
  ];
  const p = pendingMigrations(files, { tables: new Set(["courses", "judge_runs"]), versions: new Set(["20261008010000"]) });
  assert.deepEqual(p.map((m: { name: string }) => m.name), ["20261006020000_a.sql", "20261009010000_d.sql"]);
  assert.deepEqual(p.map((m: { additiv: boolean }) => m.additiv), [true, false]);
});

test("Migration nur mit frischer Sicherung", () => {
  assert.equal(backupFresh("2026-10-06T09:00:00Z", now), true);
  assert.equal(backupFresh("2026-10-04T09:00:00Z", now), false);
  assert.equal(backupFresh("", now), false);
  assert.equal(backupFresh(undefined, now), false);
});

test("Ergebnis → Produktreife-Datei: erfüllt oder gelaufen, ohne Messwert nichts", () => {
  const file = { gebaut: { "qual-offline": { datum: "d", beleg: "b" } }, bestaetigt: {} };
  const ok = applyResult(file, "offline-check", { ok: true, ergebnis: "bestanden" }, { datum: "2026-10-06", beleg: "Lauf 1" });
  assert.equal(ok.bestaetigt["qual-offline"].datum, "2026-10-06");
  assert.match(ok.bestaetigt["qual-offline"].beleg, /Lauf 1/);
  const under = applyResult(file, "cost-report", { ok: false, ergebnis: "25 €" }, { datum: "2026-10-06", beleg: "Lauf 2" });
  assert.equal(under.gelaufen["betrieb-kosten"].ergebnis, "25 €");
  assert.deepEqual(applyResult(file, "cost-report", { ok: null, ergebnis: "leer" }, { datum: "x", beleg: "y" }), file);
  assert.deepEqual(applyResult(file, "judge-backfill", { ok: true, ergebnis: "x" }, { datum: "x", beleg: "y" }), file);
  assert.ok(TASKS.migrate.secrets.includes("SUPABASE_ACCESS_TOKEN"));
});

test("Sicherheits-Stichprobe (SIN-404): nur gelaufen, nie bestaetigt; Grund bei Ausfall im Beleg", () => {
  const file = { gebaut: { "content-safety": { datum: "d", beleg: "b" } }, bestaetigt: {} };
  assert.equal(TASKS["safety-sample"].check, "content-safety");
  assert.deepEqual(TASKS["safety-sample"].secrets, []);
  const ran = applyResult(file, "safety-sample", { ok: null, ergebnis: "15 von 30 geprüft, 2 mit Befund" }, { datum: "2026-10-08", beleg: "Lauf 9" });
  assert.equal(ran.bestaetigt["content-safety"], undefined);
  assert.equal(ran.gelaufen["content-safety"].ergebnis, "15 von 30 geprüft, 2 mit Befund");
  const failed = applyResult(file, "safety-sample", { ok: null, ergebnis: "Nicht gelaufen: App nicht erreichbar" }, { datum: "2026-10-08", beleg: "Lauf 10" });
  assert.match(failed.gelaufen["content-safety"].ergebnis, /App nicht erreichbar/);
  assert.equal(failed.bestaetigt["content-safety"], undefined);
});

test("Sicherheits-Stichprobe: Trockenlauf startet nichts und nennt den Befehl", () => {
  const r = safetySample("2026-10-08", { dry: true });
  assert.equal(r.ok, null);
  assert.match(r.ergebnis, /safety-sample\.mjs --live --json/);
});

test("stageResult: fehlender Pfad (ap22-runs) verwirft die übrigen nicht (SIN-397)", () => {
  const dir = mkdtempSync(join(tmpdir(), "stage-"));
  const git = (...a: string[]) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs/product-readiness.json"), "{}\n");
  git("add", "-A");
  git("commit", "-qm", "init");
  assert.equal(stageResult({ cwd: dir }).changed, false);
  writeFileSync(join(dir, "docs/product-readiness.json"), "[1]\n");
  mkdirSync(join(dir, "docs/quality/runs"), { recursive: true });
  writeFileSync(join(dir, "docs/quality/runs/cost-report.json"), "{}\n");
  const r = stageResult({ cwd: dir });
  assert.equal(r.changed, true);
  assert.match(r.grund, /product-readiness\.json/);
  assert.match(git("diff", "--cached", "--name-only").stdout, /quality\/runs\/cost-report\.json/);
});

test("stageResult: ohne Ergebnisdatei nennt den Grund", () => {
  const dir = mkdtempSync(join(tmpdir(), "stage-"));
  spawnSync("git", ["init", "-q"], { cwd: dir });
  const r = stageResult({ cwd: dir });
  assert.equal(r.changed, false);
  assert.match(r.grund, /nichts geschrieben/);
});

test("SIN-440: lastErrorLine nimmt die letzte Fehlerzeile und maskiert Schlüssel", async () => {
  const { lastErrorLine } = await import("../../../scripts/autonomy/run-task.mjs");
  const out = [
    "secrets { ANTHROPIC_API_KEY: 'PRESENT', OPENAI_API_KEY: 'PRESENT' } chunks=10 units=20",
    "preflight ~$0.99 (Budget €3, ohne Reparatur)",
    "Error: Anthropic batch create failed: status 400 invalid_request_error: model not found (key sk-ant-abcdefghijklmnop)",
    "npm error code 1",
    "npm error path /home/runner/work",
  ].join("\n");
  const line = lastErrorLine(out);
  assert.match(line, /status 400/);
  assert.doesNotMatch(line, /abcdefghijklmnop/);
  assert.equal(lastErrorLine("nur eine Zeile"), "nur eine Zeile");
  assert.equal(lastErrorLine(""), "keine Ausgabe");
  assert.doesNotMatch(lastErrorLine("Fehler::x"), /::/);
});
