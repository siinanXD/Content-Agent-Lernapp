import assert from "node:assert/strict";
import { test } from "node:test";
import {
  forgetPostHogUser,
  syncPostHogConsent,
  type ConsentClient,
} from "./analytics-consent";

test("Nutzungsdaten löschen: Erfassung stoppt und die Kennung wird verworfen", () => {
  const calls: string[] = [];
  forgetPostHogUser({
    __loaded: true,
    opt_out_capturing: () => calls.push("opt_out"),
    reset: () => calls.push("reset"),
  });
  assert.deepEqual(calls, ["opt_out", "reset"]);
  // Nie initialisiert (nie eingewilligt): nichts zu tun
  forgetPostHogUser({
    opt_out_capturing: () => calls.push("x"),
    reset: () => calls.push("y"),
  });
  assert.deepEqual(calls, ["opt_out", "reset"]);
});

const config = { key: "phc_test", host: "https://eu.i.posthog.com" };

function fakeClient() {
  const calls: string[] = [];
  const client: ConsentClient = {
    __loaded: false,
    init() {
      calls.push("init");
      client.__loaded = true;
    },
    opt_in_capturing() {
      calls.push("opt_in");
    },
    opt_out_capturing() {
      calls.push("opt_out");
    },
  };
  return { client, calls };
}

test("ohne Antwort oder bei Ablehnung: kein init, keine Events, keine Cookies", () => {
  for (const consent of [null, false]) {
    const { client, calls } = fakeClient();
    syncPostHogConsent(client, consent, config);
    assert.deepEqual(calls, []);
  }
});

test("Zustimmung initialisiert PostHog genau einmal", () => {
  const { client, calls } = fakeClient();
  syncPostHogConsent(client, true, config);
  assert.deepEqual(calls, ["init"]);
});

test("Widerruf stoppt sofort per opt_out_capturing, erneute Zustimmung per opt_in", () => {
  const { client, calls } = fakeClient();
  syncPostHogConsent(client, true, config);
  syncPostHogConsent(client, false, config);
  syncPostHogConsent(client, true, config);
  assert.deepEqual(calls, ["init", "opt_out", "opt_in"]);
});
