import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import posthog from "posthog-js";
import * as analytics from "./analytics";
import { syncPostHogConsent, type ConsentClient } from "./analytics-consent";

// SIN-387: Laden erst nach Einwilligung, vorher und nach Widerruf nichts; Abbruch-Ereignisse
// gehen nur bei geladenem Client raus. Der Key ist gemockt (im Test-Build fehlt er).
const config = { key: "phc_test", host: "https://eu.i.posthog.com" };
const g = globalThis as Record<string, unknown>;
const original = { capture: posthog.capture, key: process.env.NEXT_PUBLIC_POSTHOG_KEY };

afterEach(() => {
  posthog.capture = original.capture;
  posthog.__loaded = false;
  delete g.window;
  if (original.key === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  else process.env.NEXT_PUBLIC_POSTHOG_KEY = original.key;
});

function fakeClient() {
  const requests: string[] = [];
  let capturing = false;
  const client: ConsentClient = {
    __loaded: false,
    init(key) {
      requests.push(`load:${key}`);
      client.__loaded = true;
      capturing = true;
    },
    opt_in_capturing() {
      capturing = true;
    },
    opt_out_capturing() {
      capturing = false;
    },
  };
  return { client, requests, isCapturing: () => capturing };
}

test("Ablauf: vorher keine Anfrage, nach Einwilligung Laden, nach Widerruf Stopp", () => {
  const { client, requests, isCapturing } = fakeClient();
  syncPostHogConsent(client, null, config);
  syncPostHogConsent(client, false, config);
  assert.deepEqual(requests, []);
  assert.equal(isCapturing(), false);

  syncPostHogConsent(client, true, config);
  assert.deepEqual(requests, ["load:phc_test"]);
  assert.equal(isCapturing(), true);

  syncPostHogConsent(client, false, config);
  assert.equal(isCapturing(), false);
  assert.deepEqual(requests, ["load:phc_test"]);
});

async function abandon() {
  analytics.trackUnitAbandoned({ unitId: "m3-02", answered: 3, total: 8 });
  analytics.trackReviewAbandoned({ answered: 1, total: 5 });
  // capture() lädt posthog-js asynchron nach
  await new Promise((r) => setTimeout(r, 50));
}

test("Abbruch-Ereignisse: ohne Key oder ohne geladenen Client wird nichts gesendet", async () => {
  const sent: string[] = [];
  posthog.capture = ((e: string) => void sent.push(e)) as typeof posthog.capture;
  g.window = {};

  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  posthog.__loaded = true;
  await abandon();

  process.env.NEXT_PUBLIC_POSTHOG_KEY = config.key;
  posthog.__loaded = false; // keine Einwilligung: nie initialisiert
  await abandon();

  assert.deepEqual(sent, []);
});

test("Abbruch-Ereignisse: nach Einwilligung (Client geladen) werden sie gesendet", async () => {
  const sent: Array<[string, unknown]> = [];
  posthog.capture = ((e: string, p: unknown) => void sent.push([e, p])) as typeof posthog.capture;
  g.window = {};
  process.env.NEXT_PUBLIC_POSTHOG_KEY = config.key;
  posthog.__loaded = true;
  await abandon();

  assert.deepEqual(sent, [
    ["unit_abandoned", { unitId: "m3-02", answered: 3, total: 8 }],
    ["review_abandoned", { answered: 1, total: 5 }],
  ]);
});
