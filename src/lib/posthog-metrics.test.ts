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
    return ok({ results: [["unit_started", 4], ["unit_completed", 3], ["onboarding_step", 2]] });
  };
  const m = await collectPostHogMetrics(env as never, fetchMock as never);
  assert.equal(
    m.posthog,
    "Abbruch je Schritt: Onboarding 100 % (0 von 2 beendet); Einheit 25 % (3 von 4 beendet); häufigste Abbruchstellen: 1. Onboarding (2)",
  );
  assert.equal(seen!.url, "https://eu.posthog.com/api/projects/7/query/");
  assert.equal(seen!.auth, "Bearer k");
});

const router = (map: Record<string, unknown[]>) => async (_url: string, init: { body: string }) => {
  const q = JSON.parse(init.body).query.query as string;
  const key = Object.keys(map).find((k) => q.includes(k))!;
  return ok({ results: map[key] });
};

test("PostHog: Daten vorhanden - drei haeufigste Abbruchstellen und Einheiten", async () => {
  const fetchMock = router({
    "group by properties.unitId": [["u-7", 3], ["u-2", 1]],
    "group by event": [
      ["onboarding_step", 5], ["onboarding_completed", 4],
      ["unit_started", 10], ["unit_completed", 6], ["unit_abandoned", 4],
      ["review_started", 4], ["review_completed", 3], ["review_abandoned", 1],
    ],
  });
  const m = await collectPostHogMetrics(env as never, fetchMock as never);
  assert.equal(
    m.posthog,
    "Abbruch je Schritt: Onboarding 20 % (4 von 5 beendet); Einheit 40 % (6 von 10 beendet); Wiederholung 25 % (3 von 4 beendet); " +
      "häufigste Abbruchstellen: 1. Einheit (4), 2. Onboarding (1), 3. Wiederholung (1); meistverlassene Einheiten: u-7 (3), u-2 (1)",
  );
});

test("PostHog: keine Lernweg-Daten, aber andere Ereignisse - keine Nutzung", async () => {
  const m = await collectPostHogMetrics(env as never, router({ "group by event": [], "select count()": [[12]] }) as never);
  assert.match(String(m.posthog), /Ursache: keine Nutzung des Lernwegs/);
});

test("PostHog: gar keine Ereignisse - Key fehlt oder keine Einwilligung", async () => {
  const m = await collectPostHogMetrics(env as never, router({ "group by event": [], "select count()": [[0]] }) as never);
  assert.match(String(m.posthog), /^keine Ereignisse in 7 Tagen \(Ursache: kein NEXT_PUBLIC_POSTHOG_KEY im Build oder keine Einwilligung/);
});

test("PostHog: Zusatzabfrage schlaegt fehl - allgemeiner Grund, kein Absturz", async () => {
  let n = 0;
  const fetchMock = async () => (n++ === 0 ? ok({ results: [] }) : ok({}, 500));
  const m = await collectPostHogMetrics(env as never, fetchMock as never, { delays: [] } as never);
  assert.match(String(m.posthog), /^keine Ereignisse in 7 Tagen \(Ursache: kein NEXT_PUBLIC_POSTHOG_KEY im Build, keine Einwilligung oder keine Nutzung\)/);
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
