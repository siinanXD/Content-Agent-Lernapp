import assert from "node:assert/strict";
import { test } from "node:test";
import { RETRY_DELAYS_MS, ServiceError, fetchJson, rateLimitLine, retryAfterMs } from "../../../scripts/autonomy/http.mjs";
import { fetchProjectIssues, linear } from "../../../scripts/autonomy/linear.mjs";

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
