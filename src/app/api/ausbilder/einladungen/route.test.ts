import { test } from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "./route";
import { POST as POST_GRUPPE } from "../gruppe/route";

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", body: JSON.stringify(body), headers });

function withoutSupabaseEnv<T>(fn: () => Promise<T>): Promise<T> {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ] as const;
  const saved = keys.map((k) => process.env[k]);
  for (const k of keys) delete process.env[k];
  return fn().finally(() =>
    keys.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i]))),
  );
}

test("ohne Token: 401 für Einladungen und Gruppe anlegen, nie zwischenspeichern", async () => {
  for (const res of [
    await GET(new Request("http://localhost/api/ausbilder/einladungen")),
    await POST(post("http://localhost/api/ausbilder/einladungen", { names: ["Aylin K."] })),
    await POST_GRUPPE(post("http://localhost/api/ausbilder/gruppe", { name: "A", schwerpunkt: "B" })),
  ]) {
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
});

test("ohne Supabase-Konfiguration: 503 statt erfundener Codes", async () => {
  const res = await withoutSupabaseEnv(() =>
    POST(post("http://localhost/api/ausbilder/einladungen", { names: ["Aylin K."] }, { authorization: "Bearer abc" })),
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).invitations, undefined);
});
