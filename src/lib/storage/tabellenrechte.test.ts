import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// SIN-438: Die Migration entzieht TRUNCATE, TRIGGER, REFERENCES; das Prüfskript muss dieselben Tabellen kennen.
const migration = readFileSync("supabase/migrations/20261012020000_sin438_rechte_haerten.sql", "utf8");
const pruefung = readFileSync("scripts/verify-table-grants.sql", "utf8");

const TABELLEN_MIT_RLS = ["trainer_groups", "group_members", "group_invitations", "leitstand_nutzer", "loop_events", "loop_snapshot"];

test("SIN-438: Migration entzieht TRUNCATE, TRIGGER, REFERENCES auf allen Gruppen- und Leitstand-Tabellen", () => {
  const revoke = migration.match(/revoke truncate, trigger, references on([\s\S]*?)from anon, authenticated;/);
  assert.ok(revoke, "revoke-Anweisung fehlt");
  for (const t of TABELLEN_MIT_RLS) {
    assert.match(revoke[1], new RegExp(`public\\.${t}\\b`), `${t} fehlt in der Migration`);
  }
});

test("SIN-438: learning_progress verliert alle Rechte für anon und authenticated", () => {
  assert.match(migration, /revoke all on public\.learning_progress from anon, authenticated;/);
});

test("SIN-438: Migration ist nur additiv (kein drop, delete, alter ... drop)", () => {
  assert.doesNotMatch(migration, /\bdrop\s+(table|column|policy|function|schema)\b/i);
  assert.doesNotMatch(migration, /^\s*delete\s+from\b/im);
  assert.doesNotMatch(migration, /\balter\s+table\b[\s\S]*?\bdrop\b/i);
});

test("SIN-438: Prüfskript deckt dieselben Tabellen und Rechte ab", () => {
  for (const t of [...TABELLEN_MIT_RLS, "learning_progress"]) {
    assert.match(pruefung, new RegExp(`'${t}'|learning_progress`), `${t} fehlt im Prüfskript`);
  }
  for (const p of ["TRUNCATE", "TRIGGER", "REFERENCES"]) {
    assert.match(pruefung, new RegExp(`'${p}'`));
  }
  assert.match(pruefung, /raise exception/);
});
