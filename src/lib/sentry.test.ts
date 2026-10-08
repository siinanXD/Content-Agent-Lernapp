import assert from "node:assert/strict";
import { test } from "node:test";
import { collectSentryMetrics } from "../../scripts/autonomy/sentry.mjs";
import { SENTRY_PRIVACY_OPTIONS, scrubEvent, shouldSendClientEvent } from "./sentry-privacy";

const env = { SENTRY_AUTH_TOKEN: "t", SENTRY_ORG: "org", SENTRY_PROJECT: "proj" };

function res(items: unknown[], link = "", status = 200) {
  return { ok: status < 400, status, json: async () => items, headers: new Headers(link ? { link } : {}) };
}

test("Sentry: ohne Token nicht verfuegbar und kein Netzaufruf", async () => {
  let calls = 0;
  const m = await collectSentryMetrics({} as never,(async () => (calls++, res([]))) as never);
  assert.equal(m.sentry, "nicht verfügbar (Secret fehlt im Workflow: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)");
  assert.equal(m.sentry_kritisch, m.sentry);
  assert.equal(calls, 0);
});

test("Sentry: zaehlt ueber Seiten, Abfrage mit Token und Level-Filter", async () => {
  const urls: string[] = [];
  const next = '<https://de.sentry.io/api/0/p2>; rel="next"; results="true"';
  const fetchMock = async (url: string, init: { headers: { Authorization: string } }) => {
    urls.push(url);
    assert.equal(init.headers.Authorization, "Bearer t");
    if (url.includes("p2")) return res([{}, {}]);
    return url.includes("level") ? res([{}], next) : res([{}, {}, {}]);
  };
  const m = await collectSentryMetrics(env as never, fetchMock as never);
  assert.equal(m.sentry_kritisch, 3);
  assert.equal(m.sentry, "3 ungelöste Fehler (7 Tage)");
  assert.ok(urls[0].startsWith("https://de.sentry.io/api/0/projects/org/proj/issues/"));
  assert.ok(urls.some((u) => u.includes("p2")));
});

test("Sentry: HTTP-Fehler - beide Abfragen liefern konkrete Fehlermeldung", async () => {
  const m = await collectSentryMetrics(env as never, (async () => res([], "", 401)) as never);
  assert.equal(m.sentry, "nicht messbar (Sentry: HTTP 401)");
  assert.match(String(m.sentry_kritisch), /^nicht messbar \(Sentry: HTTP 401\)/);
});

test("Sentry: Personendaten werden entfernt", () => {
  const e = scrubEvent({
    user: { email: "a@b.de", ip_address: "1.2.3.4" },
    server_name: "host",
    request: { url: "https://x.de/einheit/1?token=geheim#a", cookies: { s: "1" }, headers: { a: "b" }, data: { n: 1 } },
    message: "boom",
  });
  assert.equal(e.user, undefined);
  assert.equal(e.server_name, undefined);
  assert.deepEqual(e.request, { url: "https://x.de/einheit/1" });
  assert.equal(e.message, "boom");
});

test("Sentry: Abfrage zaehlt nur Issues der letzten 7 Tage (lastSeen) mit Level error/fatal, stats_period='24h'", async () => {
  const urls: string[] = [];
  const m = await collectSentryMetrics(env as never, (async (url: string) => (urls.push(url), res([{}, {}]))) as never);
  assert.equal(m.sentry_kritisch, 2);
  const q = decodeURIComponent(urls[1].replace(/\+/g, " "));
  assert.match(q, /is:unresolved level:\[error,fatal\] lastSeen:-7d/);
  assert.match(q, /statsPeriod=24h/);
});

test("Sentry: wenn erste Abfrage erfolgreich ist, aber zweite fehlschlaegt - sentry_kritisch liefert Fehler", async () => {
  let callCount = 0;
  const fetchMock = async () => {
    callCount++;
    if (callCount === 1) return res([{}, {}]); // erste Abfrage erfolgreich
    return res([], "", 401); // zweite Abfrage fehlgeschlagen
  };
  const m = await collectSentryMetrics(env as never, fetchMock as never);
  assert.equal(m.sentry, "2 ungelöste Fehler (7 Tage)");
  assert.match(String(m.sentry_kritisch), /^nicht messbar \(Sentry: HTTP 401\)/);
});

test("Sentry: Browser-Fehler nur mit Einwilligung", () => {
  assert.equal(shouldSendClientEvent(true), true);
  assert.equal(shouldSendClientEvent(false), false);
  assert.equal(shouldSendClientEvent(null), false);
});

test("Sentry: IP, Standort und Header fliegen raus (SIN-392), auch bei Transaktionen", () => {
  const mk = () => ({
    user: { ip_address: "1.2.3.4", geo: { country_code: "DE", city: "Berlin" } },
    request: { url: "https://x.de/a?b=1", headers: { "x-forwarded-for": "1.2.3.4" } },
  });
  for (const hook of [SENTRY_PRIVACY_OPTIONS.beforeSend, SENTRY_PRIVACY_OPTIONS.beforeSendTransaction]) {
    const e = hook(mk());
    assert.equal(e.user, undefined);
    assert.deepEqual(e.request, { url: "https://x.de/a" });
    assert.ok(!JSON.stringify(e).includes("1.2.3.4"));
  }
});
