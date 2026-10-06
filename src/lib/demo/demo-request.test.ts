import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mockDemoRequests,
  notifyDemoRequest,
  saveDemoRequest,
  validateDemoRequest,
} from "./demo-request";
import { POST } from "@/app/api/demo/route";

const valid = {
  organisation: "Bildungswerk Beispiel",
  contactName: "Erika Muster",
  email: "erika@beispiel.de",
  participants: "10",
  schwerpunkt: "Metall- und Kunststofftechnik",
  consent: true,
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/demo", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

test("gültige Anfrage wird angenommen", () => {
  const r = validateDemoRequest(valid);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.participants, 10);
});

test("ohne Einwilligung keine Anfrage", () => {
  for (const consent of [false, undefined, "on", "true"]) {
    const r = validateDemoRequest({ ...valid, consent });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.consent);
  }
});

test("Pflichtfelder und Grenzen", () => {
  const r = validateDemoRequest({
    organisation: " ",
    contactName: "",
    email: "kein-mail",
    participants: 0,
    schwerpunkt: "",
    consent: true,
  });
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.deepEqual(Object.keys(r.errors).sort(), [
      "contactName",
      "email",
      "organisation",
      "participants",
      "schwerpunkt",
    ]);
  }
  assert.equal(validateDemoRequest({ ...valid, participants: 501 }).ok, false);
  assert.equal(validateDemoRequest({ ...valid, participants: 1.5 }).ok, false);
  assert.equal(validateDemoRequest(null).ok, false);
});

test("Meldung an Sinan enthält keine Personendaten und entfällt ohne Secrets", async () => {
  const r = validateDemoRequest(valid);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(await notifyDemoRequest(r.value, {}), false);

  let sent = "";
  const ok = await notifyDemoRequest(
    r.value,
    { TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "c" },
    (async (_url: string, init: RequestInit) => {
      sent = String(init.body);
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch,
  );
  assert.equal(ok, true);
  assert.ok(sent.includes("Bildungswerk Beispiel"));
  assert.ok(!sent.includes("Erika"));
  assert.ok(!sent.includes("erika@beispiel.de"));
});

test("API: speichert im Mock-Betrieb, lehnt fehlende Einwilligung und Unfug ab", async () => {
  const before = mockDemoRequests.length;
  const created = await post(valid);
  assert.equal(created.status, 201);
  assert.equal(mockDemoRequests.length, before + 1);

  const noConsent = await post({ ...valid, consent: false });
  assert.equal(noConsent.status, 400);
  assert.ok((await noConsent.json()).fields.consent);

  assert.equal((await post("{kaputt")).status, 400);
  assert.equal((await post("x".repeat(9000))).status, 413);
  assert.equal(mockDemoRequests.length, before + 1);
});

test("API: Honigtopf speichert nichts", async () => {
  const before = mockDemoRequests.length;
  const res = await post({ ...valid, website: "http://spam.example" });
  assert.equal(res.status, 201);
  assert.equal(mockDemoRequests.length, before);
});

test("saveDemoRequest im Mock speichert die Einwilligung", async () => {
  const r = validateDemoRequest(valid);
  assert.ok(r.ok);
  if (r.ok) {
    await saveDemoRequest(r.value);
    assert.equal(mockDemoRequests.at(-1)?.consent, true);
  }
});
