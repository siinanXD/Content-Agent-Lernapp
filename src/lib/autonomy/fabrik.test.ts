import assert from "node:assert/strict";
import { test } from "node:test";
import { collectFabrikMetrics, deriveFabrikStatus } from "../../../scripts/autonomy/fabrik.mjs";
import { isApiLimitError, limitRegainDate, pauseReason } from "../anthropic/limit-error";
import { contentRuleHints, renderContentSection, summarizeRuns } from "../../../scripts/autonomy/content-metrics.mjs";
import { evaluateReadiness } from "../../../scripts/autonomy/readiness.mjs";
import { recordFactoryRun, toAbortedRunRecord, toFactoryRunRecord } from "../generate/factory-status";
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
  assert.deepEqual(m, {
    content_fabrik: "nicht verfügbar (Secret fehlt im Workflow: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
    content_fabrik_status: "nicht verfügbar",
    content_fabrik_ueberfaellig_tage: "nicht verfügbar",
  });
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
  const base = { runId: "r1", moduleId: "m1", generated: 8, passed: 6, costEur: 3.2, stopReason: null, startedAt: "2026-10-05T05:47:00.000Z" };
  const rec = toFactoryRunRecord(base, "course", true);
  assert.equal(rec.newModule, true);
  assert.equal(toFactoryRunRecord({ ...base, passed: 0 }, "course", true).newModule, false);
  assert.equal(toFactoryRunRecord({ ...base, moduleId: null }, "course", true).newModule, false);
  assert.deepEqual(
    Object.keys(rec).sort(),
    ["costEur", "courseId", "finishedAt", "moduleId", "newModule", "queueOpen", "runId", "startedAt", "stopReason", "stopped", "unitsGenerated", "unitsPublished"],
  );
});

test("SIN-378: Fabrik-Datensatz hält Start und Ende fest", () => {
  const base = { runId: "r1", moduleId: "m1", generated: 8, passed: 6, costEur: 3.2, stopReason: null, startedAt: "2026-10-05T05:47:00.000Z" };
  const rec = toFactoryRunRecord(base, "course", true, "2026-10-05T07:00:00.000Z");
  assert.equal(rec.startedAt, "2026-10-05T05:47:00.000Z");
  assert.equal(rec.finishedAt, "2026-10-05T07:00:00.000Z");
});

test("SIN-378: Abbruch (Secrets fehlen, Absturz) wird mit Grund protokolliert", () => {
  const rec = toAbortedRunRecord("r2", "course", "2026-10-05T05:47:00.000Z", "Secrets fehlen: A,\n B", "2026-10-05T05:48:00.000Z");
  assert.equal(rec.stopped, true);
  assert.equal(rec.stopReason, "Abbruch: Secrets fehlen: A, B");
  assert.equal(rec.newModule, false);
  assert.equal(rec.startedAt, "2026-10-05T05:47:00.000Z");
  assert.equal(rec.finishedAt, "2026-10-05T05:48:00.000Z");
  assert.equal(toAbortedRunRecord("r", "c", "s", "x".repeat(900)).stopReason?.length, "Abbruch: ".length + 300);
});

test("SIN-378: recordFactoryRun schreibt Start, Ende, Ergebnis und Abbruchgrund in content_factory_runs", async () => {
  const rows: Record<string, unknown>[] = [];
  const mock = {
    from: (t: string) => ({
      insert: async (r: Record<string, unknown>) => {
        assert.equal(t, "content_factory_runs");
        rows.push(r);
        return { error: null };
      },
    }),
  };
  await recordFactoryRun(toAbortedRunRecord("r3", "course", "2026-10-05T05:47:00.000Z", "Kurs fehlt", "2026-10-05T05:48:00.000Z"), mock as never);
  const base = { runId: "r4", moduleId: "m1", generated: 8, passed: 6, costEur: 3.2, stopReason: null, startedAt: "2026-10-12T05:47:00.000Z" };
  await recordFactoryRun(toFactoryRunRecord(base, "course", true, "2026-10-12T07:00:00.000Z"), mock as never);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    [rows[0].started_at, rows[0].finished_at, rows[0].stopped, rows[0].stop_reason],
    ["2026-10-05T05:47:00.000Z", "2026-10-05T05:48:00.000Z", true, "Abbruch: Kurs fehlt"],
  );
  assert.deepEqual([rows[1].started_at, rows[1].finished_at, rows[1].stopped, rows[1].units_published], ["2026-10-12T05:47:00.000Z", "2026-10-12T07:00:00.000Z", false, 6]);
});

test("recordFactoryRun: Fehler von Supabase wird geworfen", async () => {
  const mock = { from: () => ({ insert: async () => ({ error: { message: "kaputt" } }) }) };
  await assert.rejects(recordFactoryRun(toAbortedRunRecord("r", "c", "s", "x"), mock as never), /content_factory_runs_insert: kaputt/);
});

test("SIN-378: Fabrik nach 8 Tagen überfällig, mit Datum des letzten Laufs", () => {
  const s = deriveFabrikStatus([run(12, true)], NOW);
  assert.equal(s.status, "steht");
  assert.equal(s.overdueDays, 4);
  assert.match(s.detail, /^überfällig seit 4 Tagen \(letzter Lauf am 2026-09-25/);
  const ok = deriveFabrikStatus([run(2, true)], NOW);
  assert.match(ok.detail, /^letzter Lauf am 2026-10-05 \(vor 2 Tagen\)/);
  assert.equal(ok.overdueDays, undefined);
  assert.equal(deriveFabrikStatus([run(8, true)], NOW).status, "läuft");
});

test("SIN-378: Überfälligkeit löst die bestehende Stillstand-Regel „fabrik-haengt“ aus, einmal", () => {
  const base = { coverage: [{ mapId: "a", pct: 40, modules: [] }], passRates: [], runs: { fabrikHaengt: false }, progress: {} };
  const rules = (o: object) => contentRuleHints({ ...base, ...o }).map((h: { rule: string }) => h.rule);
  assert.deepEqual(rules({ fabrikUeberfaelligTage: 4 }), ["fabrik-haengt"]);
  assert.deepEqual(rules({ fabrikUeberfaelligTage: null }), []);
  assert.deepEqual(rules({ fabrikUeberfaelligTage: 4, runs: { fabrikHaengt: true } }), ["fabrik-haengt"]);
  const section = renderContentSection(
    { verfuegbar: true, coverage: base.coverage, passRates: [], runs: { fabrikHaengt: false, kostenLetzteLaeufe: [], einheitenNeuWoche: 0, laeufeWoche: 0, kostenWocheEur: 0 }, progress: {}, offeneVerworfene: 0 },
    { fabrik: { detail: "überfällig seit 4 Tagen (letzter Lauf am 2026-09-25)", ueberfaelligTage: 4 } },
  );
  assert.match(section, /Content-Fabrik letzter Lauf \(Statusprotokoll\): überfällig seit 4 Tagen/);
  assert.match(section, /\[fabrik-haengt\]/);
});

test("Fabrik: HTTP-Fehler - nicht messbar mit konkrete Ursache", async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, headers: new Headers(), text: async () => "", json: async () => ({}) });
  const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };
  const m = await collectFabrikMetrics(env as never, { fetchImpl: fetchImpl as never, delays: [] } as never);
  assert.match(String(m.content_fabrik), /^nicht messbar \[Zugriff verweigert\]/);
  assert.equal(m.content_fabrik_status, "nicht verfügbar");
});

test("Fabrik: Tabelle fehlt (404) → spezifische Migrationsmeldung", async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, headers: new Headers(), text: async () => "", json: async () => ({}) });
  const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };
  const m = await collectFabrikMetrics(env as never, { fetchImpl: fetchImpl as never, delays: [] } as never);
  assert.match(String(m.content_fabrik), /Migration 20261007020000 anwenden/);
});

// SIN-450: Anthropic-Limit pausiert die Fabrik, statt sie rot oder „hängt“ zu melden.
const LIMIT_BODY = '{"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC."}}';
const paused = (d: number) => ({ ...run(d, false), stop_reason: "pausiert: API-Limit am 2026-10-05 (frei ab 2026-11-01)" });

test("SIN-450: Limit-Fehler der Anthropic-API wird von anderen Fehlern unterschieden", () => {
  const limit = new Error(`Batch submit 400: ${LIMIT_BODY}`);
  assert.equal(isApiLimitError(limit), true);
  assert.equal(isApiLimitError(new Error("Your credit balance is too low to access the Anthropic API")), true);
  assert.equal(isApiLimitError(new Error('Batch submit 429: {"error":{"type":"rate_limit_error","message":"slow down"}}')), false);
  assert.equal(isApiLimitError(new Error("Batch submit 500: overloaded")), false);
  assert.equal(isApiLimitError(new Error("Kostendeckel erreicht")), false);
  assert.equal(limitRegainDate(limit), "2026-11-01");
  assert.equal(pauseReason(limit, new Date("2026-10-09T05:00:00Z")), "pausiert: API-Limit am 2026-10-09 (frei ab 2026-11-01)");
  assert.equal(pauseReason(new Error("credit balance is too low"), new Date("2026-10-09T05:00:00Z")), "pausiert: API-Limit am 2026-10-09");
});

test("SIN-450: Lauf mit Limit-Fehler ist pausiert mit Grund und Datum, nicht hängt", () => {
  const s = deriveFabrikStatus([paused(2), paused(9)], NOW);
  assert.equal(s.status, "pausiert");
  assert.match(s.detail, /pausiert: API-Limit am 2026-10-05 \(frei ab 2026-11-01\)/);
  assert.equal(deriveFabrikStatus([paused(2), run(9, false)], NOW).status, "pausiert");
});

test("SIN-450: pausierter Lauf zählt nicht für hängt; Planer legt kein Content-Issue an", () => {
  assert.equal(deriveFabrikStatus([run(2, false), paused(9)], NOW).status, "läuft");
  const reports = [{ passed: 0, stopReason: "pausiert: API-Limit am 2026-10-05" }, { passed: 0, stopReason: "pausiert: API-Limit am 2026-09-28" }];
  const runs = summarizeRuns(reports, "2026-09-01");
  assert.equal(runs.fabrikHaengt, false);
  assert.equal(summarizeRuns([{ passed: 0, stopReason: null }, { passed: 0, stopReason: null }], "2026-09-01").fabrikHaengt, true);
  const row = evaluateReadiness({ metrics: { content_fabrik_status: "pausiert", content_fabrik: "x" }, issues: [], built: {} }).find((r: { id: string }) => r.id === "betrieb-fabrik");
  assert.equal(row?.status, "offen");
});

test("SIN-450: nächster Lauf nach Aufhebung des Limits startet ohne Handarbeit", () => {
  assert.equal(deriveFabrikStatus([run(1, true), paused(8)], NOW).status, "läuft");
});

test("SIN-450: Abbruch mit Pausegrund behält den Grund ohne Abbruch-Präfix", () => {
  const reason = pauseReason(new Error(LIMIT_BODY), new Date("2026-10-09T05:00:00Z"));
  const rec = toAbortedRunRecord("r", "c", "2026-10-09T05:00:00Z", reason);
  assert.equal(rec.stopReason, "pausiert: API-Limit am 2026-10-09 (frei ab 2026-11-01)");
  assert.equal(rec.stopped, true);
});

test("Pipeline-Sentry: ohne DSN No-op, Optionen schalten Personendaten ab", () => {
  assert.equal(initPipelineSentry("test", {} as never), false);
  assert.equal(SENTRY_PRIVACY_OPTIONS.sendDefaultPii, false);
  assert.equal(SENTRY_PRIVACY_OPTIONS.beforeSend, scrubEvent);
});
