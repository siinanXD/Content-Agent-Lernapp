import assert from "node:assert/strict";
import { test } from "node:test";
import { collectFabrikMetrics } from "../../../scripts/autonomy/fabrik.mjs";
import { collectMetrics } from "../../../scripts/autonomy/planner.mjs";
import { classifyTableError, describeTableError, sinanTaskForTableError } from "../../../scripts/autonomy/table-error.mjs";

const err = (status: number, body: unknown) => ({ status, body: typeof body === "string" ? body : JSON.stringify(body) });

const FEHLT = err(404, { code: "42P01", message: 'relation "public.pipeline_run_costs" does not exist' });
const ZUGRIFF = err(401, { code: "PGRST301", message: "JWSError JWSInvalidSignature" });
const CACHE = err(404, { code: "PGRST205", message: "Could not find the table 'public.pipeline_run_costs' in the schema cache", hint: "Perhaps you meant the table 'public.units'" });
const UNBEKANNT = err(500, "boom");

test("Tabellenfehler: alle vier Klassen", () => {
  assert.equal(classifyTableError(FEHLT), "fehlt");
  assert.equal(classifyTableError(err(404, "")), "fehlt");
  assert.equal(classifyTableError(ZUGRIFF), "zugriff");
  assert.equal(classifyTableError(err(403, { code: "42501", message: "permission denied for table x" })), "zugriff");
  assert.equal(classifyTableError(CACHE), "schema-cache");
  assert.equal(classifyTableError(UNBEKANNT), "unbekannt");
});

test("Tabellenfehler: Bericht nennt Klasse und Tabelle", () => {
  assert.match(describeTableError("t", "1", FEHLT), /\[fehlt\].*Migration 1 anwenden/);
  assert.match(describeTableError("t", "1", ZUGRIFF), /\[Zugriff verweigert\]/);
  assert.match(describeTableError("t", "1", CACHE), /\[Schema-Cache\]/);
  assert.match(describeTableError("t", "1", { ...UNBEKANNT, message: "Supabase: HTTP 500" }), /\[unbekannt\].*HTTP 500/);
});

test("Tabellenfehler: Sinan-Aufgabe nur bei Zugriff und Schema-Cache", () => {
  assert.ok(sinanTaskForTableError("t", "1", ZUGRIFF)?.titel.includes("Zugriff"));
  assert.ok(sinanTaskForTableError("t", "1", CACHE)?.schritte.some((s: string) => s.includes("reload schema")));
  assert.equal(sinanTaskForTableError("t", "1", FEHLT), null);
  assert.equal(sinanTaskForTableError("t", "1", UNBEKANNT), null);
});

const reply = (status: number, body: string) => ({ ok: status < 300, status, headers: new Headers(), text: async () => body });
const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };
const quick = { delays: [], sleep: async () => {}, log: () => {} };

test("Planer und Fabrik: Mock-Antwort 401 → Zugriff verweigert, Sinan-Aufgabe vorgemerkt", async () => {
  const body = JSON.stringify({ code: "PGRST301", message: "JWT invalid" });
  const fetchImpl = (async (url: string) =>
    String(url).includes("pipeline_run_costs") || String(url).includes("content_factory_runs")
      ? reply(401, body)
      : reply(200, "[]")) as never;
  const sinanTasks: unknown[] = [];
  const m = await collectMetrics(env as never, { fetchImpl, sinanTasks, ...quick } as never);
  assert.match(String(m.kosten_pro_lauf), /\[Zugriff verweigert\]/);
  assert.match(String(m.content_fabrik), /\[Zugriff verweigert\]/);
  assert.equal(sinanTasks.length, 2);
  const f = await collectFabrikMetrics(env as never, { fetchImpl, ...quick } as never);
  assert.match(String(f.content_fabrik), /content_factory_runs/);
});
