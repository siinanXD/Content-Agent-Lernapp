import assert from "node:assert/strict";
import { test } from "node:test";
import { RETRY_DELAYS_MS, ServiceError, fetchJson, rateLimitLine, retryAfterMs } from "../../../scripts/autonomy/http.mjs";
import { fetchProjectIssues, linear } from "../../../scripts/autonomy/linear.mjs";
import { abortLinearDown, collectMetrics } from "../../../scripts/autonomy/planner.mjs";
import { analyze } from "../../../scripts/autonomy/status.mjs";

type Reply = { status?: number; body: string; headers?: Record<string, string> };
const reply = ({ status = 200, body, headers = { "content-type": "application/json" } }: Reply) =>
  new Response(body, { status, headers });
const HTML = { body: "upstream connect error or disconnect/reset before headers. reset reason: connection termination", headers: { "content-type": "text/plain" } };

/** Antworten der Reihe nach; die letzte wiederholt sich. */
function sequence(replies: Reply[]) {
  const calls: string[] = [];
  const fetchImpl = async (url: string) => {
    calls.push(url);
    return reply(replies[Math.min(calls.length - 1, replies.length - 1)]);
  };
  return { fetchImpl: fetchImpl as never, calls };
}
const waits: number[] = [];
const quick = { sleep: async (ms: number) => void waits.push(ms), log: () => {} };

test("fetchJson: Fehlerseite statt JSON wird 3× wiederholt (1 s, 4 s, 10 s), dann klare Meldung", async () => {
  waits.length = 0;
  const { fetchImpl, calls } = sequence([{ status: 200, ...HTML }]);
  await assert.rejects(fetchJson("Sentry", "https://x.test/a", {}, { fetchImpl, ...quick }), (e: ServiceError) => {
    assert.equal(e.service, "Sentry");
    assert.match(e.message, /^Sentry: keine JSON-Antwort \(HTTP 200, text\/plain\): upstream connect error/);
    assert.ok(e.message.split(": ").slice(2).join(": ").length <= 80);
    return true;
  });
  assert.equal(calls.length, 4);
  assert.deepEqual(waits, RETRY_DELAYS_MS);
});

test("fetchJson: 503 und dann JSON → Erfolg", async () => {
  const { fetchImpl, calls } = sequence([{ status: 503, ...HTML }, { body: '{"ok":true}' }]);
  assert.deepEqual(await fetchJson("Vercel", "https://x.test/a", {}, { fetchImpl, ...quick }), { ok: true });
  assert.equal(calls.length, 2);
});

test("fetchJson: 429 beachtet Retry-After", async () => {
  waits.length = 0;
  const { fetchImpl } = sequence([{ status: 429, body: "slow down", headers: { "retry-after": "7" } }, { body: "[]" }]);
  assert.deepEqual(await fetchJson("Linear", "https://x.test/a", {}, { fetchImpl, ...quick }), []);
  assert.deepEqual(waits, [7000]);
});

test("fetchJson: 4xx (außer 429) wird nicht wiederholt, Meldung enthält Dienst, Status und Antwortanfang", async () => {
  const { fetchImpl, calls } = sequence([{ status: 401, body: "x".repeat(200) }]);
  await assert.rejects(fetchJson("Langfuse", "https://x.test/a", {}, { fetchImpl, ...quick }), (e: ServiceError) => {
    assert.equal(e.message, `Langfuse: HTTP 401: ${"x".repeat(80)}`);
    return true;
  });
  assert.equal(calls.length, 1);
});

test("fetchJson: Netzfehler wird wiederholt", async () => {
  let n = 0;
  const fetchImpl = (async () => {
    if (++n < 3) throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
    return reply({ body: "1" });
  }) as never;
  assert.equal(await fetchJson("Supabase", "https://x.test/a", {}, { fetchImpl, ...quick }), 1);
  assert.equal(n, 3);
});

test("Hilfen: Retry-After und Rate-Limit-Zeile", () => {
  assert.equal(retryAfterMs("5"), 5000);
  assert.equal(retryAfterMs("9999"), 30000);
  assert.equal(retryAfterMs(undefined), null);
  assert.equal(retryAfterMs("Wed, 21 Oct 2026 07:28:05 GMT", Date.parse("Wed, 21 Oct 2026 07:28:00 GMT")), 5000);
  const line = rateLimitLine(new Headers({ "x-ratelimit-requests-remaining": "10", "content-type": "x" }));
  assert.equal(line, "x-ratelimit-requests-remaining=10");
});

test("Rate-Limit-Header werden protokolliert", async () => {
  const lines: string[] = [];
  const { fetchImpl } = sequence([{ body: "{}", headers: { "content-type": "application/json", "x-ratelimit-requests-remaining": "41" } }]);
  await fetchJson("Linear", "https://x.test/a", {}, { fetchImpl, sleep: async () => {}, log: (l: string) => void lines.push(l) });
  assert.deepEqual(lines, ["Linear Rate-Limit: x-ratelimit-requests-remaining=41"]);
});

test("Linear: kurzer 502 mit Fehlerseite, dann Antwort → Issues gelesen", async () => {
  const { fetchImpl, calls } = sequence([{ status: 502, ...HTML }, { body: JSON.stringify({ data: { issues: { nodes: [{ identifier: "SIN-1" }] } } }) }]);
  const call = (q: string, v?: object) => linear(q, v, { key: "k", fetchImpl, ...quick });
  assert.deepEqual(await fetchProjectIssues(call as never), [{ identifier: "SIN-1" }]);
  assert.equal(calls.length, 2);
});

test("Linear: GraphQL-Fehler bleiben Fehler, ohne Wiederholung", async () => {
  const { fetchImpl, calls } = sequence([{ body: JSON.stringify({ errors: [{ message: "bad" }] }) }]);
  await assert.rejects(linear("q", {}, { key: "k", fetchImpl, ...quick }), /Linear-Fehler/);
  assert.equal(calls.length, 1);
});

test("Planer: optionale Dienste mit Fehlerseite → „nicht messbar“, kein Absturz", async () => {
  const env = {
    SUPABASE_URL: "https://sb.test",
    SUPABASE_SERVICE_ROLE_KEY: "k",
    SENTRY_AUTH_TOKEN: "t",
    SENTRY_ORG: "o",
    SENTRY_PROJECT: "p",
    POSTHOG_PERSONAL_API_KEY: "k",
    POSTHOG_PROJECT_ID: "1",
  };
  const { fetchImpl } = sequence([{ status: 200, ...HTML }]);
  const m = await collectMetrics(env as never, { fetchImpl, ...quick });
  assert.match(String(m.einheiten), /^nicht messbar \(Supabase: keine JSON-Antwort/);
  assert.match(String(m.sentry), /^nicht messbar \(Sentry: keine JSON-Antwort/);
  assert.match(String(m.posthog), /^nicht messbar \(PostHog: /);
  assert.equal(m.sentry_kritisch, "nicht verfügbar");
});

test("Planer: Linear nicht erreichbar → saubere Warnung und Ausgabe linear_ok=false", () => {
  const lines: string[] = [];
  abortLinearDown(new ServiceError("Linear", "HTTP 503"), {} as never,(l: string) => void lines.push(l));
  assert.match(lines[0], /^::warning::Planer abgebrochen: Linear: HTTP 503/);
});

test("Wächter: Linear nicht lesbar → kein Nachfüllen, Sperre (lastRefill) bleibt unverändert", () => {
  const snap = { now: "2026-10-06T05:00:00Z", runs: [], prs: [], issues: [], linearOk: false, phaseEnv: { phase: "bauen" }, usage: {} };
  const r = analyze(snap, {}, { lastRefill: "2026-10-05T01:00:00Z" } as never);
  assert.equal(r.refill.trigger, false);
  assert.match(r.refill.reason, /Linear nicht lesbar/);
  assert.equal(r.state.lastRefill, "2026-10-05T01:00:00Z");
  const ok = analyze({ ...snap, linearOk: true }, {}, {});
  assert.equal(ok.refill.trigger, true);
});

test("Planer: Kostentabelle fehlt (404 PGRST205) → klare Meldung statt HTTP 404", async () => {
  const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };
  const fetchImpl = (async (url: string) =>
    String(url).includes("pipeline_run_costs")
      ? reply({ status: 404, body: JSON.stringify({ code: "PGRST205", message: "Could not find the table" }) })
      : reply({ body: "[]", headers: { "content-type": "application/json", "content-range": "0-0/3" } })) as never;
  const m = await collectMetrics(env as never, { fetchImpl, ...quick });
  assert.match(String(m.kosten_pro_lauf), /^nicht messbar \(Tabelle pipeline_run_costs fehlt/);
  assert.doesNotMatch(String(m.kosten_pro_lauf), /404/);
});
