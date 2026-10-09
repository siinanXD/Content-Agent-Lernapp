import { test } from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "./route";

const post = (body: unknown) =>
  new Request("http://localhost/api/ausbilder/zugang", { method: "POST", body: JSON.stringify(body) });

function withoutSupabaseEnv<T>(fn: () => Promise<T>): Promise<T> {
  const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
  const saved = keys.map((k) => process.env[k]);
  for (const k of keys) delete process.env[k];
  return fn().finally(() =>
    keys.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]))),
  );
}

test("ungültiger Code: 404 beim Prüfen, nie zwischenspeichern", async () => {
  const res = await GET(new Request("http://localhost/api/ausbilder/zugang?code=x"));
  assert.equal(res.status, 404);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("ungültige E-Mail oder Code: 400, es wird nichts reserviert", async () => {
  assert.equal((await POST(post({ code: "ABCDEF123456XYZ", email: "kaputt" }))).status, 400);
  assert.equal((await POST(post({ code: "kurz", email: "a@b.de" }))).status, 400);
  assert.equal((await POST(post(null))).status, 400);
});

test("ohne Supabase-Konfiguration: 503 statt erfundener Zusage", async () => {
  const res = await withoutSupabaseEnv(() =>
    POST(post({ code: "ABCDEF123456XYZ", email: "a@traeger.de" })),
  );
  assert.equal(res.status, 503);
  const get = await withoutSupabaseEnv(() =>
    GET(new Request("http://localhost/api/ausbilder/zugang?code=ABCDEF123456XYZ")),
  );
  assert.equal(get.status, 503);
});
