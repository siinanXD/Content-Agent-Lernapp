import assert from "node:assert/strict";
import { test } from "node:test";
import { collectSentryMetrics } from "../../scripts/autonomy/sentry.mjs";
import { scrubEvent, shouldSendClientEvent } from "./sentry-privacy";

const env = { SENTRY_AUTH_TOKEN: "t", SENTRY_ORG: "org", SENTRY_PROJECT: "proj" };

function res(items: unknown[], link = "", status = 200) {
  return { ok: status < 400, status, json: async () => items, headers: new Headers(link ? { link } : {}) };
}

test("Sentry: ohne Token „nicht verfügbar“ und kein Netzaufruf", async () => {
  let calls = 0;
  const m = await collectSentryMetrics({} as never,(async () => (calls++, res([]))) as never);
  assert.deepEqual(m, { sentry: "nicht verfügbar", sentry_kritisch: "nicht verfügbar" });
  assert.equal(calls, 0);
});

test("Sentry: zählt über Seiten, Abfrage mit Token und Level-Filter", async () => {
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

test("Sentry: HTTP-Fehler bleibt „nicht verfügbar“ für die Kritisch-Zahl", async () => {
  const m = await collectSentryMetrics(env as never, (async () => res([], "", 401)) as never);
  assert.equal(m.sentry, "Fehler: HTTP 401");
  assert.equal(m.sentry_kritisch, "nicht verfügbar");
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

test("Sentry: Browser-Fehler nur mit Einwilligung", () => {
  assert.equal(shouldSendClientEvent(true), true);
  assert.equal(shouldSendClientEvent(false), false);
  assert.equal(shouldSendClientEvent(null), false);
});
