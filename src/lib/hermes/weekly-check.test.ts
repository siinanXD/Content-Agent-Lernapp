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
});
