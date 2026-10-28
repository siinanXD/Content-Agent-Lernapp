import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as create } from "./route";
import { POST as research } from "./[id]/research/route";
import { POST as plan } from "./[id]/plan/route";
import { POST as generate } from "./[id]/generate/route";
import { POST as evaluate } from "./[id]/evaluate/route";
import { POST as publish } from "./[id]/publish/route";
import { POST as refresh } from "./[id]/refresh/route";
import { GET as lernpfad } from "./[id]/lernpfad/route";
import { POST as pilot } from "../pilot/maf/route";

const url = "http://localhost/api/courses";
const ctx = { params: Promise.resolve({ id: "x" }) };
const handlers = [create, research, plan, generate, evaluate, publish, refresh] as const;

function ohneSupabase<T>(fn: () => Promise<T>) {
  const keys = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const saved = keys.map((k) => process.env[k]);
  keys.forEach((k) => delete process.env[k]);
  return fn().finally(() => keys.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]))));
}

test("ohne Token: 401 auf allen Pipeline-Routen", async () => {
  for (const handler of handlers) {
    const res = await handler(new Request(url, { method: "POST", body: "{}" }), ctx);
    assert.equal(res.status, 401);
  }
});

test("mit Token, aber ohne Supabase-Konfiguration: 503 statt Zugriff", () =>
  ohneSupabase(async () => {
    for (const handler of handlers) {
      const res = await handler(
        new Request(url, { method: "POST", body: "{}", headers: { authorization: "Bearer abc" } }),
        ctx,
      );
      assert.equal(res.status, 503);
    }
  }));

test("Lernpfad (nur lesen) und Pilot bleiben ohne Token erreichbar", async () => {
  const lp = await lernpfad(new Request(url), ctx);
  assert.notEqual(lp.status, 401);
  // 422 = Pilot lief durch, nur das Qualitäts-Gate hat die Veröffentlichung gesperrt (nicht 401/503).
  const res = await pilot();
  assert.ok([200, 422].includes(res.status), `Pilot-Status ${res.status}`);
});
