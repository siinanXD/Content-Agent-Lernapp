import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { analyze, buildQuotaRows, collectUsage, fetchFailureLine, parseState, percent, renderAlert } from "../../../scripts/autonomy/status.mjs";
import { startOrder } from "../../../scripts/autonomy/linear.mjs";

const fixture = () => JSON.parse(readFileSync("docs/autonomy/fixture-status.json", "utf8"));
const limits = JSON.parse(readFileSync("docs/autonomy/free-tier-limits.json", "utf8"));
const keys = (r: { incidents: { key: string }[] }) => r.incidents.map((i) => i.key);

test("Status: fehlgeschlagener Worker → Erwähnung mit @siinanXD und Fehlerzeile", () => {
  const r = analyze(fixture(), limits, {});
  assert.ok(keys(r).includes("worker-failed:1"));
  const alert = renderAlert(r.fresh);
  assert.match(alert, /^@siinanXD /);
  assert.match(alert, /Worker SIN-999 fehlgeschlagen: Absichtlicher Test-Fehler/);
});

test("Status: jede Meldung nur einmal pro Vorfall, danach wieder frei", () => {
  const first = analyze(fixture(), limits, {});
  const again = analyze(fixture(), limits, parseState(first.body));
  assert.equal(again.fresh.length, 0);
  assert.equal(renderAlert(again.fresh), "");
  // Vorfall weg → Merker weg → kommt er wieder, wird neu gemeldet.
  const healthy = { ...fixture(), failures: {}, runs: fixture().runs.filter((x: { id: number }) => x.id !== 1) };
  const cleared = analyze(healthy, limits, parseState(first.body));
  assert.ok(!cleared.state.reported.includes("worker-failed:1"));
  const back = analyze(fixture(), limits, cleared.state as Parameters<typeof analyze>[2]);
  assert.ok(back.fresh.some((i: { key: string }) => i.key === "worker-failed:1"));
});

test("Status: Stillstand, hängendes In Progress, Freigabe-Wartezeit", () => {
  const snap = fixture();
  snap.runs = [];
  snap.now = "2026-10-05T13:00:00Z";
  // Mit SIN-200 sind beide Slots belegt: kein „idle“, aber SIN-200 hat einen gemergten PR → Selbstheilung statt Meldung.
  const full = keys(analyze(snap, limits, {}));
  assert.ok(!full.includes("idle"));
  assert.ok(!full.includes("stuck:SIN-200"));
  snap.issues = snap.issues.filter((i: { identifier: string }) => i.identifier !== "SIN-200");
  const k = keys(analyze(snap, limits, {}));
  assert.ok(k.includes("idle"));
  assert.ok(k.includes("stuck:SIN-238")); // kein Worker, kein PR
  assert.ok(k.includes("approval:70")); // risk:high ohne Freigabe seit > 2 h
});

test("Status: kein Alarm bei laufendem Worker und frischen Daten", () => {
  const snap = fixture();
  snap.runs = snap.runs.filter((r: { name: string; status?: string }) => r.name !== "worker" || r.status === "in_progress");
  snap.prs = [];
  snap.usage = {};
  snap.issues = snap.issues.filter((i: { identifier: string }) => i.identifier !== "SIN-200");
  const r = analyze(snap, limits, {});
  assert.deepEqual(keys(r), []);
  assert.match(r.body, /Worker SIN-238 \(läuft\) seit 20 Min/);
});

test("Status: Pause und Kontingent über 80 % werden gemeldet", () => {
  const snap = fixture();
  snap.paused = "2026-10-05T15:00:00Z";
  const r = analyze(snap, limits, {});
  assert.ok(keys(r).includes("pause:2026-10-05T15:00:00.000Z"));
  assert.ok(keys(r).includes("quota:vercel_deployments_tag")); // 85 von 100
  assert.match(r.body, /Vercel Hobby: Deployments heute \| 85 Deployments\/Tag \| 100 Deployments\/Tag \| 85 % ⚠️/);
  assert.match(r.body, /Langfuse: Units im Monat \| nicht messbar/);
});

test("Status: Merge-Konflikt → @claude, nach 2 Versuchen Sinan", () => {
  const snap = fixture();
  const first = analyze(snap, limits, {});
  const ask = first.actions.find((a: { type: string }) => a.type === "ask-claude") as { pr: number; text: string };
  assert.equal(ask.pr, 65);
  assert.match(ask.text, /^@claude .*origin\/main/);
  assert.ok(!keys(first).includes("conflict:65"));
  // Zu früh: keine zweite Bitte, keine Eskalation.
  const soon = analyze(snap, limits, first.state as Parameters<typeof analyze>[2]);
  assert.equal(soon.actions.filter((a: { type: string }) => a.type === "ask-claude").length, 0);
  // Nach Wartezeit: zweite Bitte, dann Eskalation.
  const later = (min: number, st: object) =>
    analyze({ ...snap, now: new Date(Date.parse(snap.now) + min * 60000).toISOString() }, limits, st);
  const second = later(50, first.state);
  assert.equal(second.actions.filter((a: { type: string }) => a.type === "ask-claude").length, 1);
  const third = later(100, second.state);
  assert.equal(third.actions.filter((a: { type: string }) => a.type === "ask-claude").length, 0);
  assert.ok(keys(third).includes("conflict:65"));
  assert.match(renderAlert(third.fresh), /@siinanXD/);
});

test("Status: merge-gate rot trotz Freigabe → Hinweis, Linear-Abgleich → Done", () => {
  const snap = fixture();
  snap.prs[1].labels = ["risk:high", "freigegeben"];
  snap.checks = { 70: { mergeGate: "failure" } };
  const r = analyze(snap, limits, {});
  assert.ok(keys(r).includes("stale-gate:70"));
  assert.match(r.incidents.find((i: { key: string }) => i.key === "stale-gate:70")?.text ?? "", /entfernen und neu setzen/);
  assert.deepEqual(
    r.actions.filter((a: { type: string }) => a.type === "linear-done").map((a) => (a as { issue: { identifier: string } }).issue.identifier),
    ["SIN-200"],
  );
});

test("Status: Schlange in Startreihenfolge, blockierte mit Grund, Kick bei Stillstand", () => {
  const snap = fixture();
  assert.deepEqual(startOrder(snap.issues).map((i: { identifier: string }) => i.identifier), ["SIN-300", "SIN-301"]);
  const r = analyze(snap, limits, {});
  assert.match(r.body, /1\. SIN-300 Fortschrittsbalken \(Spur frontend\)/);
  assert.match(r.body, /⛔ SIN-302 Neuer Screen: wartet auf Mensch/);
  assert.equal(r.kick, false); // Worker läuft
  snap.runs = snap.runs.filter((x: { name: string }) => x.name !== "worker");
  snap.issues = snap.issues.filter((i: { state: { type: string } }) => i.state.type !== "started");
  assert.equal(analyze(snap, limits, {}).kick, true); // letzter Dispatch vor 30 Min
  snap.runs[0].created_at = "2026-10-05T11:58:00Z";
  assert.equal(analyze(snap, limits, {}).kick, false); // gerade erst gelaufen: keine Dauerschleife
});

test("Status: Kontingent-Prozent und nicht messbar", () => {
  assert.equal(percent(45, 100), 45);
  assert.equal(percent(1, 3), 33.3);
  assert.equal(percent(5, null), null);
  assert.equal(percent(undefined, 10), null);
  const rows = buildQuotaRows({ supabase_db_mb: 450 }, limits);
  assert.equal(rows.find((r: { key: string }) => r.key === "supabase_db_mb")?.pct, 90);
  assert.equal(rows.find((r: { key: string }) => r.key === "sentry_events_monat")?.pct, null);
});

test("Status: collectUsage ohne Tokens → nicht messbar, mit Vercel-Token → Zahl", async () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const runs = [{ created_at: "2026-10-05T01:00:00Z" }, { created_at: "2026-10-04T23:00:00Z" }] as never[];
  const none = await collectUsage({ env: {} as unknown as NodeJS.ProcessEnv, now, runs, fetchImpl: (async () => assert.fail("kein Netz")) as unknown as typeof fetch });
  assert.equal(none.github_actions_laeufe_tag, 1);
  assert.match(none.vercel_deployments_tag.error, /VERCEL_TOKEN/);
  const mock = (async (url: string) => {
    assert.match(url, /api\.vercel\.com\/v6\/deployments/);
    return { ok: true, json: async () => ({ deployments: [{}, {}, {}] }) };
  }) as unknown as typeof fetch;
  const withToken = await collectUsage({ env: { VERCEL_TOKEN: "t" } as unknown as NodeJS.ProcessEnv, now, runs, fetchImpl: mock });
  assert.equal(withToken.vercel_deployments_tag, 3);
  const failing = (async () => ({ ok: false, status: 403 })) as unknown as typeof fetch;
  const bad = await collectUsage({ env: { VERCEL_TOKEN: "t" } as unknown as NodeJS.ProcessEnv, now, runs, fetchImpl: failing });
  assert.match(bad.vercel_deployments_tag.error, /403/);
});

test("Status: Fehlerzeile aus Annotation, sonst Schrittname", async () => {
  const jobs = { jobs: [{ id: 9, name: "work", conclusion: "failure", steps: [{ name: "Test-Fehler", conclusion: "failure" }] }] };
  const withNote = (async (path: string) => (path.includes("annotations") ? [{ annotation_level: "failure", message: "Boom\nzweite Zeile" }] : jobs)) as never;
  assert.equal(await fetchFailureLine("o/r", 1, withNote), "Boom zweite Zeile");
  const noNote = (async (path: string) => (path.includes("annotations") ? [] : jobs)) as never;
  assert.equal(await fetchFailureLine("o/r", 1, noNote), "Schritt „Test-Fehler“ fehlgeschlagen");
});
