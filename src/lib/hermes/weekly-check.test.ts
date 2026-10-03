import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hermesWeeklyDryRun } from "./weekly-check";

describe("hermesWeeklyDryRun", () => {
  it("returns dry-run scaffold without claiming live Telegram", () => {
    const r = hermesWeeklyDryRun();
    assert.equal(r.mode, "dry-run");
    assert.equal(r.liveBlocked, true);
    assert.ok(r.sources.length >= 1);
  });

  it("plans the check over the curriculum sources and the seeded lock", () => {
    const r = hermesWeeklyDryRun();
    assert.ok(r.sources.some((s) => s.url.includes("maschf_ausbv") && s.mapIds.length === 7));
    assert.ok(r.sources.some((s) => s.url.includes("indkflausbv") && s.mapIds.includes("indkfl")));
    assert.deepEqual(r.sourcesMissingInLock, []);
    assert.ok(r.watchKeywords.length >= 8);
    assert.ok(r.sources.every((s) => s.status === "skipped-live"));
  });
});
