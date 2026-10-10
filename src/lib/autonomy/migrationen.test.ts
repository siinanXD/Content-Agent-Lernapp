import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { collectMigrations, duplicateVersions, migrationIncident, migrationStatus, readMigrationFiles, sinanTaskForMigrations } from "../../../scripts/autonomy/migrationen.mjs";
import { migrationStand, recordVersionSql } from "../../../scripts/autonomy/run-task.mjs";

test("Migrationen: keine doppelte Versionsnummer im Repo (SIN-374)", () => {
  const names = readMigrationFiles().map((f: { name: string }) => f.name);
  assert.ok(names.length >= 9);
  assert.deepEqual(duplicateVersions(names), []);
  for (const n of names) assert.match(n, /^\d{14}_[a-z0-9_]+\.sql$/, n);
});

test("Migrationen: neue Doppelte werden erkannt, die bekannte Altlast nicht", () => {
  assert.deepEqual(duplicateVersions(["20261006010000_a.sql", "20261006010000_b.sql"]), []);
  assert.deepEqual(duplicateVersions(["20261009010000_a.sql", "20261009010000_b.sql", "20261010010000_c.sql"]), ["20261009010000"]);
});

test("Migrationen: Stand n/n und fehlende Dateien", () => {
  const files = [
    { name: "20261003030000_a.sql", sql: "create table if not exists public.courses (id int);" },
    { name: "20261008010000_b.sql", sql: "create table if not exists public.pipeline_run_costs (id int);" },
    { name: "20261009010000_c.sql", sql: "alter table public.courses add column x int;" },
  ];
  const ok = migrationStatus(files, { tables: new Set(["courses", "pipeline_run_costs"]), versions: new Set(["20261009010000"]) });
  assert.equal(ok.line, "Migrationen: 3/3 angewendet");
  assert.equal(migrationIncident(ok).incident, null);
  const bad = migrationStatus(files, { tables: new Set(["courses"]), versions: new Set() });
  assert.equal(bad.applied, 1);
  assert.deepEqual(bad.additiveMissing, ["20261008010000_b.sql", "20261009010000_c.sql"]);
  const { incident, bug } = migrationIncident(bad);
  assert.match(incident!.text, /1\/3 angewendet.*20261008010000_b\.sql/);
  assert.match(bug!.title, /Migrationen fehlen in Supabase \(1\/3\)/);
  assert.deepEqual(bug!.labels, ["claude", "Bug"]);
});

test("Migrationen: Wächter liest Tabellen und Versionen über die Management-API", async () => {
  const files = [{ name: "20261003030000_a.sql", sql: "create table if not exists public.courses (id int);" }];
  const reply = (rows: unknown) => ({ ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify(rows) });
  const fetchImpl = (async (_url: string, init: { body: string }) =>
    reply(init.body.includes("schema_migrations") ? [] : [{ table_name: "courses" }])) as unknown as typeof fetch;
  const env = { SUPABASE_ACCESS_TOKEN: "t", SUPABASE_PROJECT_REF: "ref" };
  assert.equal((await collectMigrations(env, { fetchImpl, files }))?.line, "Migrationen: 1/1 angewendet");
  assert.equal(await collectMigrations({}, { fetchImpl, files }), null);
});

test("Migrationen: Version wird nach dem Anwenden eingetragen, Namen werden geprüft", () => {
  assert.equal(
    recordVersionSql("20261008010000_sin351_reload_schema_cache.sql"),
    "insert into supabase_migrations.schema_migrations (version, name) values ('20261008010000', 'sin351_reload_schema_cache') on conflict (version) do nothing",
  );
  assert.throws(() => recordVersionSql("20261008010000_x'; drop table a;--.sql"));
  assert.throws(() => recordVersionSql("abc_x.sql"));
});

test("Migrationen: migrate.yml läuft nach Merge auf supabase/migrations und vor dem Deploy", () => {
  const wf = readFileSync(".github/workflows/migrate.yml", "utf8");
  assert.match(wf, /push:\s*\n\s*branches: \[main\]\s*\n\s*paths:\s*\n\s*- "supabase\/migrations\/\*\*"/);
  assert.match(wf, /run-task\.mjs --task migrate/);
  assert.match(wf, /SUPABASE_PROJECT_REF: \$\{\{ secrets\.SUPABASE_PROJECT_REF \|\| vars\.SUPABASE_PROJECT_REF \}\}/);
  assert.match(readFileSync(".github/workflows/production-deploy.yml", "utf8"), /migrationen\.mjs --check/);
});

test("Migrationen: nicht additiv ergibt Sinan-Aufgabe statt Bug-Issue (SIN-451)", () => {
  const files = [
    { name: "20261013010000_sin415_gruppen.sql", sql: "alter table public.trainer_groups drop constraint if exists k;" },
    { name: "20261014010000_sin416_orgs.sql", sql: "alter table public.organisations add column x int;" },
  ];
  const none = { tables: new Set<string>(), versions: new Set<string>() };
  const nurNichtAdditiv = migrationStatus(files.slice(0, 1), none);
  assert.deepEqual(nurNichtAdditiv.blockedMissing, ["20261013010000_sin415_gruppen.sql"]);
  assert.deepEqual(nurNichtAdditiv.additiveMissing, []);
  assert.equal(migrationIncident(nurNichtAdditiv).bug, null);
  const task = sinanTaskForMigrations(nurNichtAdditiv);
  assert.match(task!.titel, /sin415_gruppen/);
  assert.equal(task!.schritte.length, 3);

  const gemischt = migrationStatus(files, none);
  assert.deepEqual(gemischt.additiveMissing, ["20261014010000_sin416_orgs.sql"]);
  assert.deepEqual(gemischt.blockedMissing, ["20261013010000_sin415_gruppen.sql"]);
  assert.ok(migrationIncident(gemischt).bug);

  const ok = migrationStatus(files, { tables: new Set<string>(), versions: new Set(["20261013010000", "20261014010000"]) });
  assert.equal(sinanTaskForMigrations(ok), null);
});

test("Migrationen: Lauf meldet n/n angewandt oder abweichend (SIN-451)", () => {
  assert.equal(migrationStand(15, 0), "Migrationen: 15/15 angewandt");
  assert.equal(migrationStand(15, 2), "Migrationen: 13/15 abweichend");
});
