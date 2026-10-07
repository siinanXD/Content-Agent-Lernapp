import assert from "node:assert/strict";
import { test } from "node:test";
import { collectFabrikMetrics, deriveFabrikStatus } from "../../../scripts/autonomy/fabrik.mjs";
import { evaluateReadiness } from "../../../scripts/autonomy/readiness.mjs";
import { toFactoryRunRecord } from "../generate/factory-status";
import { initPipelineSentry } from "../sentry-pipeline";
import { SENTRY_PRIVACY_OPTIONS, scrubEvent } from "../sentry-privacy";

const NOW = Date.parse("2026-10-07T12:00:00Z");
const day = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const run = (d: number, new_module: boolean, queue_open = true) => ({ created_at: day(d), new_module, queue_open });

test("Fabrik: wöchentlicher Lauf mit neuem Modul läuft", () => {
  assert.equal(deriveFabrikStatus([run(2, true), run(9, true)], NOW).status, "läuft");
});

test("Fabrik: 2 Läufe ohne neues Modul hängt", () => {
  assert.equal(deriveFabrikStatus([run(2, false), run(9, false), run(16, true)], NOW).status, "hängt");
});

test("Fabrik: 1 Lauf ohne neues Modul hängt noch nicht", () => {
  assert.equal(deriveFabrikStatus([run(2, false), run(9, true)], NOW).status, "läuft");
  assert.equal(deriveFabrikStatus([run(2, false)], NOW).status, "läuft");
});

test("Fabrik: leere Queue ist kein Hängen", () => {
  assert.equal(deriveFabrikStatus([run(2, false, false), run(9, false, false)], NOW).status, "läuft");
});

test("Fabrik: kein Lauf seit über 8 Tagen oder gar keiner: steht", () => {
  assert.equal(deriveFabrikStatus([run(12, true)], NOW).status, "steht");
  assert.equal(deriveFabrikStatus([], NOW).status, "steht");
});

test("Fabrik: ohne Supabase-Zugang „nicht verfügbar“ und kein Netzaufruf", async () => {
  let calls = 0;
  const m = await collectFabrikMetrics({} as never, { fetchImpl: (async () => (calls++, {})) as never });
  assert.deepEqual(m, { content_fabrik: "nicht verfügbar", content_fabrik_status: "nicht verfügbar" });
  assert.equal(calls, 0);
});

test("Fabrik: liest die letzten 2 Läufe aus Supabase", async () => {
  const urls: string[] = [];
  const fetchImpl = async (url: string) => (
    urls.push(url),
    { ok: true, status: 200, json: async () => [run(1, false), run(8, false)], headers: new Headers() }
  );
  const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };
  const m = await collectFabrikMetrics(env as never, { fetchImpl: fetchImpl as never });
  assert.equal(m.content_fabrik_status, "hängt");
  assert.match(urls[0], /content_factory_runs\?.*limit=2/);
});

test("Produktreife: Fabrik-Zeile folgt dem Status, ohne Messung „nicht verfügbar“", () => {
  const row = (metrics: Record<string, string>) =>
    evaluateReadiness({ metrics, issues: [], built: {} }).find((r: { id: string }) => r.id === "betrieb-fabrik");
  assert.equal(row({})?.status, "nicht verfügbar");
  assert.equal(row({ content_fabrik_status: "läuft", content_fabrik: "x" })?.status, "ok");
  assert.equal(row({ content_fabrik_status: "hängt", content_fabrik: "x" })?.status, "offen");
});

test("Fabrik-Datensatz: neues Modul nur bei veröffentlichten Einheiten, nur Kennungen und Zahlen", () => {
  const base = { runId: "r1", moduleId: "m1", generated: 8, passed: 6, costEur: 3.2, stopReason: null };
  const rec = toFactoryRunRecord(base, "course", true);
  assert.equal(rec.newModule, true);
  assert.equal(toFactoryRunRecord({ ...base, passed: 0 }, "course", true).newModule, false);
  assert.equal(toFactoryRunRecord({ ...base, moduleId: null }, "course", true).newModule, false);
  assert.deepEqual(
    Object.keys(rec).sort(),
    ["costEur", "courseId", "moduleId", "newModule", "queueOpen", "runId", "stopReason", "stopped", "unitsGenerated", "unitsPublished"],
  );
});

test("Pipeline-Sentry: ohne DSN No-op, Optionen schalten Personendaten ab", () => {
  assert.equal(initPipelineSentry("test", {} as never), false);
  assert.equal(SENTRY_PRIVACY_OPTIONS.sendDefaultPii, false);
  assert.equal(SENTRY_PRIVACY_OPTIONS.beforeSend, scrubEvent);
});
