import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as anfragen } from "../anfragen/route";
import { GET as kurse } from "../kurse/route";
import { GET, POST } from "./route";

const url = "http://localhost/api/admin/organisationen";

test("ohne Token: 401 auf allen Admin-Routen, nie zwischenspeichern", async () => {
  for (const handler of [GET, anfragen, kurse]) {
    const res = await handler(new Request(url));
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
  const res = await POST(new Request(url, { method: "POST", body: "{}" }));
  assert.equal(res.status, 401);
});

test("mit Token, aber ohne Supabase-Konfiguration: 503 statt Zugriff", async () => {
  const keys = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
  const saved = keys.map((k) => process.env[k]);
  for (const k of keys) delete process.env[k];
  try {
    const res = await GET(new Request(url, { headers: { authorization: "Bearer abc" } }));
    assert.equal(res.status, 503);
  } finally {
    keys.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i])));
  }
});
