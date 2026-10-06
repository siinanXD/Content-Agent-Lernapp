import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkDatabase, getHealth, getHealthReport } from "./health";
import { supabaseSecretsPresent } from "@/lib/storage";

describe("health", () => {
  it("reports ok", () => {
    const h = getHealth();
    assert.equal(h.ok, true);
    assert.equal(h.service, "content-agent-lernapp");
    // COURSE_STORAGE=mock in npm test → mock backend even with live secrets.
    assert.equal(h.storage, "mock");
    assert.equal(h.supabaseConfigured, supabaseSecretsPresent());
  });
});

describe("health: Datenbank", () => {
  it("Mock-Speicher gilt als erreichbar, ohne Abfrage", async () => {
    let called = false;
    const db = await checkDatabase("mock", () => {
      called = true;
      return Promise.resolve({ error: null });
    });
    assert.equal(db, "mock");
    assert.equal(called, false);
    const r = await getHealthReport();
    assert.equal(r.status, 200);
    assert.equal(r.body.db, "mock");
  });

  it("Supabase antwortet → ok, 200", async () => {
    assert.equal(await checkDatabase("supabase", () => Promise.resolve({ error: null })), "ok");
    const r = await getHealthReport("ok");
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
  });

  it("Fehler, Ausnahme und Zeitüberschreitung → unreachable, 503", async () => {
    assert.equal(await checkDatabase("supabase", () => Promise.resolve({ error: new Error("x") })), "unreachable");
    assert.equal(await checkDatabase("supabase", () => Promise.reject(new Error("down"))), "unreachable");
    assert.equal(await checkDatabase("supabase", () => new Promise(() => {}), 20), "unreachable");
    const r = await getHealthReport("unreachable");
    assert.equal(r.status, 503);
    assert.equal(r.body.ok, false);
  });
});
