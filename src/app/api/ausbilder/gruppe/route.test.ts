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

// SIN-1586: Supabase per fetch gemockt (erfundene Daten). `groups` ist die Antwort auf trainer_groups.
async function mitSupabase(role: string | undefined, groups: unknown[], url = "http://localhost/api/ausbilder/gruppe") {
  const alt = { fetch: globalThis.fetch, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
  process.env.SUPABASE_URL = "http://supabase.test";
  process.env.SUPABASE_ANON_KEY = "anon";
  globalThis.fetch = (async (input: Request | string | URL) => {
    const ziel = String(input instanceof Request ? input.url : input);
    if (ziel.includes("/auth/v1/user")) {
      return Response.json({ id: "u1", aud: "authenticated", app_metadata: role ? { role } : {} });
    }
    return Response.json(ziel.includes("/rest/v1/trainer_groups") ? groups : []);
  }) as typeof fetch;
  try {
    return await GET(new Request(url, { headers: { authorization: "Bearer abc" } }));
  } finally {
    globalThis.fetch = alt.fetch;
    for (const [k, v] of [["SUPABASE_URL", alt.url], ["SUPABASE_ANON_KEY", alt.key]] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("SIN-1586: Ausbilder ohne Gruppe bekommt 200 mit leerem Zustand, kein 404", async () => {
  const res = await mitSupabase("ausbilder", []);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), { group: null, members: [] });
});

test("SIN-1586: ohne Ausbilder-Rolle bleibt es 403", async () => {
  const res = await mitSupabase(undefined, []);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).members, undefined);
});

test("SIN-1586: eine ausdrücklich gewählte, unbekannte Gruppe bleibt 404", async () => {
  const res = await mitSupabase("ausbilder", [], "http://localhost/api/ausbilder/gruppe?id=11111111-1111-4111-8111-111111111111");
  assert.equal(res.status, 404);
});
