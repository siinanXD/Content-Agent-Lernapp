import assert from "node:assert/strict";
import { test } from "node:test";
import { KONTO_TOKENS, buildPlan, normalizeInput, schemaName, sharedSchemaSql, slugify, startIssues } from "../../../scripts/autonomy/starter.mjs";

const IDEE = "Belege per Foto erfassen und für die Buchhaltung ablegen.";

test("Kürzel und Schemaname", () => {
  assert.equal(slugify("Beleg Scanner Äß"), "beleg-scanner-ass");
  assert.equal(schemaName("beleg-scanner"), "beleg_scanner");
  assert.throws(() => schemaName("public"));
  assert.throws(() => schemaName("1x"));
});

test("Eingabe wird geprüft", () => {
  assert.throws(() => normalizeInput({ name: "", idee: IDEE }));
  assert.throws(() => normalizeInput({ name: "Beleg", idee: "kurz" }));
  assert.throws(() => normalizeInput({ name: "Beleg", idee: IDEE, ohne: ["foo"] }));
  assert.deepEqual(normalizeInput({ name: "Beleg", idee: IDEE, supabase: "aus" }).ohne, ["supabase"]);
});

test("Standardplan: geteiltes Schema, alle Kerndienste, nur Tokennamen", () => {
  const p = buildPlan({ name: "Beleg", idee: IDEE });
  const ids = p.steps.map((s: { id: string }) => s.id);
  for (const d of ["github", "infisical", "vercel", "sentry", "linear", "supabase", "cron"]) assert.ok(ids.includes(d), d);
  assert.equal(p.schema, "beleg");
  assert.match(p.steps.find((s: { id: string }) => s.id === "supabase")?.sql ?? "", /create schema if not exists beleg;/);
  for (const t of p.braucht) assert.ok(KONTO_TOKENS.includes(t), t);
});

test("Supabase eigen bei vollem Free-Tier: Aufgabe für Sinan statt Abbruch", () => {
  const p = buildPlan({ name: "Beleg", idee: IDEE, supabase: "eigen" }, { supabaseAktiv: 2 });
  const s = p.steps.find((x: { id: string }) => x.id === "supabase");
  assert.equal(s?.sinan, true);
  assert.deepEqual(s?.braucht, []);
});

test("Optionen lassen Schritte weg", () => {
  const ids = buildPlan({ name: "Beleg", idee: IDEE, ohne: ["posthog", "langfuse"] }).steps.map((s: { id: string }) => s.id);
  assert.ok(!ids.includes("posthog") && !ids.includes("langfuse"));
});

test("Schema-SQL löscht nichts und schaltet RLS auf der Migrations-Tabelle ein", () => {
  const sql = sharedSchemaSql("beleg");
  assert.doesNotMatch(sql, /\b(drop|truncate|delete from)\b/i);
  assert.match(sql, /beleg\.schema_migrations/);
  assert.match(sql, /enable row level security/);
});

test("Start-Issues: AP-00 und Design-Paket", () => {
  const [ap, design] = startIssues({ name: "Beleg", idee: IDEE });
  assert.match(ap.titel, /^AP-00/);
  assert.deepEqual(design.labels, ["design"]);
});
