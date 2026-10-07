import assert from "node:assert/strict";
import { test } from "node:test";
import { collectPostHogMetrics } from "../../scripts/autonomy/posthog.mjs";

const env = { POSTHOG_PERSONAL_API_KEY: "k", POSTHOG_PROJECT_ID: "7" };
const ok = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers({ "content-type": "application/json" }),
  json: async () => body,
  text: async () => JSON.stringify(body),
});

test("PostHog: ohne Schluessel nicht verfuegbar und kein Netzaufruf", async () => {
  let calls = 0;
  const m = await collectPostHogMetrics({} as never, (async () => (calls++, ok({}))) as never);
  assert.equal(m.posthog, "nicht verfügbar (Secret fehlt im Workflow: POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID)");
  assert.equal(calls, 0);
});

test("PostHog: fragt EU-Host mit Bearer-Token ab und liefert die Ergebnisse", async () => {
  let seen: { url: string; auth: string } | null = null;
  const fetchMock = async (url: string, init: { headers: { Authorization: string } }) => {
    seen = { url, auth: init.headers.Authorization };
    return ok({ results: [["unit_started", 4]] });
  };
  const m = await collectPostHogMetrics(env as never, fetchMock as never);
  assert.equal(m.posthog, '[["unit_started",4]]');
  assert.equal(seen!.url, "https://eu.posthog.com/api/projects/7/query/");
  assert.equal(seen!.auth, "Bearer k");
});

test("PostHog: HTTP-Fehler - nicht messbar mit Statuscode", async () => {
  const m = await collectPostHogMetrics(env as never, (async () => ok({}, 401)) as never, { delays: [] } as never);
  assert.match(String(m.posthog), /^nicht messbar \(PostHog: HTTP 401/);
});

test("PostHog: Netzfehler - nicht messbar mit Fehlermeldung", async () => {
  const fetchMock = async () => {
    throw new Error("ECONNREFUSED");
  };
  const m = await collectPostHogMetrics(env as never, fetchMock as never, { delays: [] } as never);
  assert.match(String(m.posthog), /^nicht messbar \(PostHog: nicht erreichbar/);
});
