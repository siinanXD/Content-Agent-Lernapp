import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadAllCurricula } from "../content/curriculum";
import type { DiffResult } from "../content/source-watch";
import {
  applyWeeklyAlerts,
  hermesWeeklyDryRun,
  planWeeklyAlerts,
  refreshRequestBody,
  type SourceCheckReportLike,
} from "./weekly-check";

describe("hermesWeeklyDryRun", () => {
  it("returns dry-run scaffold without claiming live Telegram", () => {
    const r = hermesWeeklyDryRun();
    assert.equal(r.mode, "dry-run");
    assert.equal(r.liveBlocked, true);
    assert.ok(r.sources.length >= 1);
  });

  it("plans the check over curriculum maps (loadAllCurricula), not the MAF seed list", () => {
    const r = hermesWeeklyDryRun();
    assert.ok(r.sources.some((s) => s.url.includes("maschf_ausbv") && s.mapIds.length === 7));
    assert.ok(r.sources.some((s) => s.url.includes("indkflausbv") && s.mapIds.includes("indkfl")));
    assert.deepEqual(r.sourcesMissingInLock, []);
    assert.ok(r.watchKeywords.length >= 8);
    assert.ok(r.sources.every((s) => s.status === "skipped-live"));
    assert.ok(!r.lockPath.includes("maf-sources.json"));
  });
});

describe("AP-16 weekly alerts from source-check report", () => {
  const curricula = loadAllCurricula();
  const metall = curricula.find((c) => c.id === "maf-metall")!;

  const fixtureReport = (): SourceCheckReportLike => {
    const diff: DiffResult = {
      changed: [
        {
          url: "https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html",
          field: "standLabel",
          before: "Stand: alt",
          after: "Stand: neu",
          mapIds: ["maf-metall", "maf-kunststoff"],
        },
      ],
      weak: [],
      unreachable: [],
      unchanged: [],
      unknown: [],
    };
    return {
      checkedAt: "2026-10-03T12:00:00.000Z",
      diff,
      feedHits: [],
      affected: [
        {
          mapId: "maf-metall",
          sourceId: "ao-anlage",
          modules: [{ moduleId: "PA", blockIds: metall.modules.find((m) => m.id === "PA")?.blocks.map((b) => b.id) ?? ["pa-1"] }],
        },
        {
          mapId: "maf-kunststoff",
          sourceId: "ao-anlage",
          modules: [{ moduleId: "PA", blockIds: ["pa-1"] }],
        },
      ],
    };
  };

  it("plans Linear titles „Quelle geändert: <Map>“, Prüfung nötig, and selective refresh bodies", () => {
    const plan = planWeeklyAlerts(fixtureReport(), curricula);
    assert.deepEqual(plan.changedMapIds.sort(), ["maf-kunststoff", "maf-metall"]);
    assert.ok(plan.linearIssues.every((i) => i.title.startsWith("Quelle geändert: ")));
    assert.ok(plan.linearIssues.some((i) => i.title === "Quelle geändert: maf-metall"));
    assert.ok(plan.mapStatusUpdates.every((u) => u.status === "Prüfung nötig"));
    const body = refreshRequestBody(plan.refreshTargets.find((t) => t.mapId === "maf-metall")!);
    assert.ok(body.sourceIds.includes("ao-anlage"));
    assert.ok(body.moduleIds.includes("PA"));
    assert.ok(body.blockIds.length >= 1);
  });

  it("soft-skips Telegram and Linear when secrets are absent (package must not fail)", async () => {
    const result = await applyWeeklyAlerts(fixtureReport(), {
      writeMapStatus: false,
      notify: true,
      curricula,
      env: {},
      fetchImpl: async () => {
        throw new Error("network should not be called without secrets");
      },
    });
    assert.equal(result.telegram.sent, false);
    assert.match(result.telegram.skippedReason ?? "", /TELEGRAM/);
    assert.ok(result.linear.every((l) => !l.created && (l.skippedReason ?? "").includes("LINEAR")));
    assert.ok(result.mapStatus.every((m) => m.status === "Prüfung nötig" && m.written === false));
  });

  it("sends Telegram and creates Linear issues when secrets are present", async () => {
    const calls: string[] = [];
    const result = await applyWeeklyAlerts(fixtureReport(), {
      writeMapStatus: false,
      notify: true,
      curricula,
      env: {
        TELEGRAM_BOT_TOKEN: "test-token",
        TELEGRAM_CHAT_ID: "123",
        LINEAR_API_KEY: "lin_test",
        LINEAR_TEAM_ID: "team_test",
      },
      fetchImpl: async (input, init) => {
        const url = String(input);
        calls.push(url);
        const host = new URL(url).hostname;
        if (host === "api.telegram.org") {
          assert.equal(init?.method, "POST");
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (host === "api.linear.app") {
          return new Response(
            JSON.stringify({ data: { issueCreate: { success: true, issue: { url: "https://linear.app/x/issue/SIN-999" } } } }),
            { status: 200 },
          );
        }
        throw new Error(`unexpected fetch ${url}`);
      },
    });
    assert.equal(result.telegram.sent, true);
    assert.equal(result.linear.length, 2);
    assert.ok(result.linear.every((l) => l.created && l.url && new URL(l.url).hostname === "linear.app"));
    assert.ok(calls.some((u) => new URL(u).hostname === "api.telegram.org"));
    assert.ok(calls.some((u) => new URL(u).hostname === "api.linear.app"));
  });
});
