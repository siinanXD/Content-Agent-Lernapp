import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { buildEvent, buildSnapshot, main, projectOf, sendEvent, sendSnapshot, sumUsage } from "../../../scripts/autonomy/leitstand.mjs";
import { analyze } from "../../../scripts/autonomy/status.mjs";

const ENV = {
  GITHUB_REPOSITORY: "siinanXD/Content-Agent-Lernapp",
  GITHUB_RUN_ID: "42",
  GITHUB_SERVER_URL: "https://github.com",
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "svc",
  NODE_ENV: "test" as const,
};
const NOW = 1_000_000;

test("Projekt: Repo ohne Besitzer, LEITSTAND_PROJEKT hat Vorrang", () => {
  assert.equal(projectOf(ENV), "Content-Agent-Lernapp");
  assert.equal(projectOf({ ...ENV, LEITSTAND_PROJEKT: "anderes" }), "anderes");
});

test("Ereignis Start: Kennungen, Lauf-Link, keine Dauer, keine Tokens", () => {
  const e = buildEvent({ schritt: "worker", status: "start", issue: "SIN-1" }, ENV, NOW);
  assert.equal(e.project, "Content-Agent-Lernapp");
  assert.equal(e.step, "worker");
  assert.equal(e.issue, "SIN-1");
  assert.equal(e.run_url, "https://github.com/siinanXD/Content-Agent-Lernapp/actions/runs/42");
  assert.equal(e.duration_ms, null);
  assert.equal(e.input_tokens, null);
  assert.equal(e.cost_usd, null);
});

test("Ereignis Ende: Dauer aus Startzeit, Tokens und Kosten aus der Nutzung", () => {
  const usage = sumUsage([{ input: 10, output: 5, cacheRead: 100, cacheWrite: 7, turns: 3, durationMs: 9000, costUsd: 0.5 }]);
  const e = buildEvent({ schritt: "worker", status: "ok", issue: "SIN-1", pr: "12", seit: String(NOW - 4000), usage }, ENV, NOW);
  assert.equal(e.duration_ms, 4000);
  assert.equal(e.pr, 12);
  assert.deepEqual([e.input_tokens, e.output_tokens, e.cache_read_tokens, e.cache_write_tokens, e.cost_usd], [10, 5, 100, 7, 0.5]);
});

test("Ereignis Ende ohne Startzeit: Dauer aus der Nutzung, sonst leer", () => {
  assert.equal(buildEvent({ schritt: "worker", status: "fehler", usage: sumUsage([{ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 1, durationMs: 777, costUsd: null }]) }, ENV, NOW).duration_ms, 777);
  assert.equal(buildEvent({ schritt: "digest", status: "ok" }, ENV, NOW).duration_ms, null);
  assert.equal(buildEvent({ schritt: "digest", status: "ok", seit: "" }, ENV, NOW).duration_ms, null);
});

test("Nutzung beider Worker-Versuche wird summiert", () => {
  const a = { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, turns: 5, durationMs: 1000, costUsd: 0.25 };
  const s = sumUsage([a, null, { ...a, costUsd: null }]);
  assert.deepEqual([s?.input, s?.output, s?.turns, s?.durationMs, s?.costUsd], [2, 4, 10, 2000, 0.25]);
  assert.equal(sumUsage([null]), null);
});

test("Unbekannter Schritt oder Status wirft, Projekt fehlt wirft", () => {
  assert.throws(() => buildEvent({ schritt: "x", status: "ok" }, ENV), /Unbekannter Schritt/);
  assert.throws(() => buildEvent({ schritt: "worker", status: "kaputt" }, ENV), /Unbekannter Status/);
  assert.throws(() => buildEvent({ schritt: "worker", status: "ok" }, { NODE_ENV: "test" }), /Projekt unbekannt/);
});

test("sendEvent: POST an loop_events mit Service-Role, ohne Secrets nur Hinweis", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response("[{}]", { status: 201 });
  };
  const event = buildEvent({ schritt: "dispatch", status: "ok" }, ENV, NOW);
  const r = await sendEvent(event, ENV, { fetchImpl });
  assert.equal(r.ok, true);
  assert.equal(calls[0].url, "https://x.supabase.co/rest/v1/loop_events");
  assert.equal(calls[0].init.method, "POST");
  assert.equal((calls[0].init.headers as Record<string, string>).apikey, "svc");
  assert.equal(JSON.parse(String(calls[0].init.body)).step, "dispatch");
  const none = await sendEvent(event, { ...ENV, SUPABASE_URL: "" }, { fetchImpl });
  assert.equal(none.ok, false);
  assert.match(String(none.grund), /SUPABASE_URL/);
  assert.equal(calls.length, 1);
});

test("sendEvent: Netz- oder Tabellenfehler wirft nie", async () => {
  const fetchImpl = async () => new Response('{"code":"PGRST205"}', { status: 404 });
  const r = await sendEvent(buildEvent({ schritt: "status", status: "ok" }, ENV, NOW), ENV, { fetchImpl, delays: [] });
  assert.equal(r.ok, false);
  assert.match(String(r.grund), /404/);
});

test("Schnappschuss: Upsert je Projekt", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response("[{}]", { status: 201 });
  };
  const snap = buildSnapshot({ quotas: [{ key: "vercel" }], queue: { startable: 3 }, openPrs: [{ number: 1 }] }, ENV, new Date("2026-10-08T10:00:00Z"));
  assert.equal(snap.project, "Content-Agent-Lernapp");
  assert.equal(snap.updated_at, "2026-10-08T10:00:00.000Z");
  assert.equal((await sendSnapshot(snap, ENV, { fetchImpl })).ok, true);
  assert.match(calls[0].url, /loop_snapshot\?on_conflict=project$/);
  assert.match((calls[0].init.headers as Record<string, string>).Prefer, /merge-duplicates/);
});

test("CLI: schreibt ein Ereignis, ein Tippfehler im Schritt wird nur gewarnt", async () => {
  const logs: string[] = [];
  const orig = console.log;
  console.log = (l: string) => logs.push(String(l));
  const bodies: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    bodies.push(String(init.body));
    return new Response("[{}]", { status: 201 });
  }) as typeof fetch;
  try {
    await main(["ereignis", "--schritt", "worker", "--status", "ok", "--issue", "SIN-303"], ENV);
    await main(["ereignis", "--schritt", "unsinn", "--status", "ok"], ENV);
  } finally {
    console.log = orig;
    globalThis.fetch = realFetch;
  }
  assert.equal(bodies.length, 1);
  assert.match(logs[0], /worker ok \(SIN-303\) gespeichert/);
  assert.match(logs[1], /::warning::Leitstand: Unbekannter Schritt/);
});

test("Status liefert Schlange und offene PRs für den Schnappschuss", () => {
  const res = analyze({ now: "2026-10-08T10:00:00Z", runs: [], prs: [{ number: 7, title: "feat(x): y (SIN-1)", head: "claude/sin-1", state: "open", labels: [{ name: "risk:medium" }], draft: false }], issues: [], usage: {} }, {}, {});
  assert.deepEqual(Object.keys(res.queue).sort(), ["in_progress", "paused", "running", "startable", "todo", "waiting"]);
  assert.equal(res.openPrList[0].number, 7);
  assert.equal(res.openPrList[0].risk, "risk:medium");
});

test("Migration: nur neue Tabellen, RLS an, Lesen nur für Leitstand-Nutzer, keine Löschbefehle", () => {
  const name = readdirSync("supabase/migrations").find((f) => f.includes("sin303_leitstand"));
  assert.ok(name);
  const sql = readFileSync(`supabase/migrations/${name}`, "utf8");
  for (const t of ["loop_events", "loop_snapshot", "leitstand_nutzer"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${t}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`));
  }
  assert.doesNotMatch(sql, /\b(drop|truncate|delete)\b/i);
  assert.doesNotMatch(sql, /to anon|to public/i);
  assert.match(sql, /notify pgrst, 'reload schema'/);
  assert.match(sql, /leitstand_nutzer n where n\.user_id = auth\.uid\(\)/);
});

test("Workflows: jeder Schritt schreibt Start und Ende", () => {
  const files: Record<string, string> = { dispatch: "dispatch", worker: "worker", "pr-gate": "pr-gate", planner: "planner", digest: "digest", status: "status" };
  for (const [step, file] of Object.entries(files)) {
    const y = readFileSync(`.github/workflows/${file}.yml`, "utf8");
    assert.match(y, new RegExp(`leitstand\\.mjs ereignis --schritt ${step} --status start`), `${file}: Start`);
    assert.match(y, new RegExp(`leitstand\\.mjs ereignis --schritt ${step} --status "\\$status"`), `${file}: Ende`);
  }
});
