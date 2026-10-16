import assert from "node:assert/strict";
import test from "node:test";
import { aboConfig, createAboSession, isTestSessionId, readAboStatus } from "./abo";

const ok = { ok: true as const, secret: "sk_test_x", priceId: "price_1" };
const reply = (json: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(json), { status })) as typeof fetch;

test("Konfiguration: fehlend, Live-Schlüssel abgelehnt, Testschlüssel ok", () => {
  assert.deepEqual(aboConfig({}), { ok: false, reason: "nicht-eingerichtet" });
  assert.deepEqual(aboConfig({ STRIPE_SECRET_KEY: "sk_live_abc", STRIPE_PRICE_ID: "price_1" }), {
    ok: false,
    reason: "kein-testschluessel",
  });
  assert.equal(aboConfig({ STRIPE_SECRET_KEY: '"sk_test_abc"', STRIPE_PRICE_ID: "price_1" }).ok, true);
});

test("Sitzung: Abo-Modus, Preis aus Konfiguration, Rückkehr-Adressen", async () => {
  let sent = new URLSearchParams();
  const f = (async (_u: string, init: RequestInit) => {
    sent = init.body as URLSearchParams;
    return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/x", livemode: false }));
  }) as unknown as typeof fetch;
  assert.equal(await createAboSession(ok, "https://app.test", f), "https://checkout.stripe.com/c/x");
  assert.equal(sent.get("mode"), "subscription");
  assert.equal(sent.get("line_items[0][price]"), "price_1");
  assert.match(sent.get("success_url") ?? "", /^https:\/\/app\.test\/abo\/bestaetigung\?session_id=\{CHECKOUT_SESSION_ID\}$/);
});

test("Sitzung: Fehler und Livemodus ergeben null", async () => {
  assert.equal(await createAboSession(ok, "https://a", reply({}, 400)), null);
  assert.equal(await createAboSession(ok, "https://a", reply({ url: "https://x", livemode: true })), null);
});

test("Status: nur Testsitzungen, complete = bestätigt", async () => {
  assert.equal(isTestSessionId("cs_live_abcdefghij"), false);
  assert.equal(await readAboStatus(ok, "cs_live_abcdefghij", reply({})), "unbekannt");
  assert.equal(await readAboStatus(ok, "cs_test_abcdefghij", reply({ status: "complete" })), "bestaetigt");
  assert.equal(await readAboStatus(ok, "cs_test_abcdefghij", reply({ status: "open" })), "offen");
  assert.equal(await readAboStatus(ok, "cs_test_abcdefghij", reply({}, 404)), "unbekannt");
});
