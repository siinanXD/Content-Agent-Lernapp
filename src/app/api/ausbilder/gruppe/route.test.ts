import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route";

const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/ausbilder/gruppe", { headers });

function withoutSupabaseEnv<T>(fn: () => Promise<T>): Promise<T> {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ] as const;
  const saved = keys.map((k) => process.env[k]);
  for (const k of keys) delete process.env[k];
  return fn().finally(() => keys.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]))));
}

test("ohne Token: 401, nie mit Daten, nicht zwischenspeichern", async () => {
  const res = await GET(req());
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal((await res.json()).members, undefined);
});

test("ohne Supabase-Konfiguration: 503 statt erfundener Daten", async () => {
  const res = await withoutSupabaseEnv(() => GET(req({ authorization: "Bearer abc" })));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).members, undefined);
});
