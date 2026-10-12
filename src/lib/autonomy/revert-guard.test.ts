import assert from "node:assert/strict";
import { test } from "node:test";
import { decideRevert, failedSteps, isRevertTitle, stepResults } from "../../../scripts/autonomy/revert-guard.mjs";

const now = new Date("2026-10-12T12:00:00Z");
const S = "build / Leistungsbudget";

test("roter Schritt auf dem Eltern-Commit → kein Revert, Gate-Bruch-Issue", () => {
  const r = decideRevert({ failed: [S], parent: { [S]: "failure" }, now });
  assert.equal(r.aktion, "gate-issue");
  assert.deepEqual(r.schritte, [S]);
});

test("Schritt auf dem Eltern-Commit nicht gelaufen → kein Revert", () => {
  assert.equal(decideRevert({ failed: [S], parent: {}, now }).aktion, "gate-issue");
});

test("Schritt auf dem Eltern-Commit grün → Revert", () => {
  assert.equal(decideRevert({ failed: [S], parent: { [S]: "success" }, now }).aktion, "revert");
});

test("ein Schritt grün, einer nicht → Gate-Bruch nur für den zweiten", () => {
  const r = decideRevert({ failed: [S, "build / Lint"], parent: { [S]: "success" }, now });
  assert.equal(r.aktion, "gate-issue");
  assert.deepEqual(r.schritte, ["build / Lint"]);
});

test("zwei rote Läufe hintereinander → nur ein Revert, danach Meldung", () => {
  const input = { failed: [S], parent: { [S]: "success" }, now };
  assert.equal(decideRevert({ ...input, recentReverts: [] }).aktion, "revert");
  const zweiter = decideRevert({ ...input, recentReverts: [{ createdAt: "2026-10-12T11:30:00Z" }] });
  assert.equal(zweiter.aktion, "melden");
});

test("Revert älter als eine Stunde sperrt nicht", () => {
  const r = decideRevert({ failed: [S], parent: { [S]: "success" }, recentReverts: [{ createdAt: "2026-10-12T10:00:00Z" }], now });
  assert.equal(r.aktion, "revert");
});

test("roter Revert-Commit → Kette gestoppt, Meldung", () => {
  assert.equal(decideRevert({ failed: [S], parent: { [S]: "success" }, title: "revert: x zurücknehmen (SIN-1)", now }).aktion, "melden");
  assert.ok(isRevertTitle('Revert "feat: x"'));
  assert.ok(!isRevertTitle("feat: reverting"));
});

test("Schritte aus Jobs lesen", () => {
  const all = stepResults([{ name: "build", steps: [{ name: "Lint", conclusion: "success" }, { name: "Test", conclusion: "failure" }, { name: "Skip" }] }]);
  assert.deepEqual(failedSteps(all), ["build / Test"]);
});
