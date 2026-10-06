import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { countLimitAborts, limitAlerts, limitIssue, newLimitIssues, renderWeeklyReport, weeklyReport } from "../../../scripts/autonomy/limits.mjs";

const limits = JSON.parse(readFileSync("docs/autonomy/free-tier-limits.json", "utf8"));

test("Limits: Warnung ab 80 % (inklusive), nur gemessene Werte", () => {
  const names = (u: Record<string, unknown>) => limitAlerts(u, limits).map((a: { key: string }) => a.key);
  assert.deepEqual(names({ vercel_deployments_tag: 79 }), []);
  assert.deepEqual(names({ vercel_deployments_tag: 80 }), ["vercel_deployments_tag"]);
  assert.deepEqual(names({ supabase_db_mb: { error: "TOKEN fehlt" } }), []);
  assert.deepEqual(names({}), []);
});

test("Limits: ein Issue je Limit, keine Dubletten", () => {
  // SIN-266: Vercel bekommt nie ein Issue, Supabase-Speicher erst ab 90 % (mit Label claude).
  const alerts = limitAlerts({ vercel_deployments_tag: 95, supabase_db_mb: 450 }, limits);
  const items = newLimitIssues(alerts);
  assert.equal(items.length, 1);
  assert.match(items[0].title, /^Free-Tier: .+ nahe am Limit$/);
  assert.match(items[0].description, /90 %/);
  assert.ok(items[0].labels.includes("claude"));
  const supabase = alerts.find((a: { key: string }) => a.key === "supabase_db_mb");
  assert.equal(newLimitIssues(alerts, [` ${limitIssue(supabase).title} `]).length, 0);
  assert.equal(newLimitIssues(limitAlerts({ supabase_db_mb: 410 }, limits)).length, 0);
});

test("Limits: Wochenbericht zählt Läufe, Limit-Abbrüche und gemergte PRs der letzten 7 Tage", () => {
  const now = new Date("2026-10-11T12:00:00Z");
  const r = weeklyReport({
    now,
    limitAborts: 1,
    runs: [
      { name: "worker", created_at: "2026-10-10T10:00:00Z" },
      { name: "worker", created_at: "2026-10-01T10:00:00Z" },
      { name: "ci", created_at: "2026-10-10T10:00:00Z" },
    ],
    prs: [{ merged_at: "2026-10-09T10:00:00Z" }, { merged_at: "2026-09-01T10:00:00Z" }, { merged_at: null }],
  });
  assert.deepEqual(r, { gestartet: 1, abgebrochen_limit: 1, gemergt: 1 });
  assert.match(renderWeeklyReport({ ...r, abgebrochen_limit: null }), /nicht verfügbar/);
});

test("Limits: Limit-Abbruch = Schritt „Pause bis Reset setzen“ lief", async () => {
  const jobs: Record<number, unknown> = {
    1: { jobs: [{ steps: [{ name: "Pause bis Reset setzen", conclusion: "success" }] }] },
    2: { jobs: [{ steps: [{ name: "Pause bis Reset setzen", conclusion: "skipped" }] }] },
  };
  const call = async (path: string) => jobs[Number(path.match(/runs\/(\d+)\//)![1])];
  const runs = [{ id: 1, name: "worker" }, { id: 2, name: "worker" }, { id: 3, name: "ci" }];
  assert.equal(await countLimitAborts("o/r", runs, call), 1);
});
