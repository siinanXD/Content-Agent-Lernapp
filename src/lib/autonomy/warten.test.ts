import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { pickMany, startOrder } from "../../../scripts/autonomy/linear.mjs";
import { analyze } from "../../../scripts/autonomy/status.mjs";
import { GATE_PREFIX, detectGateBreaks, gateActions, waitReason, waitingIssues } from "../../../scripts/autonomy/warten.mjs";

const mk = (identifier: string, priority: number, over: Record<string, unknown> = {}) => ({
  id: identifier,
  identifier,
  title: identifier,
  priority,
  state: { name: "Todo", type: "unstarted" },
  inverseRelations: { nodes: [] },
  ...over,
});
const lane = (name: string) => ({ labels: { nodes: [{ name }] } });
const inProgress = (id: string, over = {}) => mk(id, 2, { state: { name: "In Progress", type: "started" }, ...over });
const pr = (number: number, id: string, over: Record<string, unknown> = {}) => ({ number, title: `feat: x (${id})`, head: `claude/${id.toLowerCase()}`, state: "open", labels: [], ...over });

test("SIN-327: 2 Issues In Progress mit roten PRs + 1 Urgent-Todo → Urgent wird gestartet", () => {
  const issues = [inProgress("SIN-315"), inProgress("SIN-296"), mk("SIN-322", 1)];
  const prs = [
    pr(131, "SIN-315", { ci: "failure", labels: ["repair:3"] }),
    pr(138, "SIN-296", { mergeable_state: "dirty" }),
  ];
  // Ohne Wartezustand: beide Plätze belegt.
  assert.equal(pickMany(issues, 2).issues.length, 0);
  const waiting = waitingIssues(issues, prs, []);
  assert.deepEqual([...waiting.keys()], ["SIN-315", "SIN-296"]);
  assert.deepEqual(pickMany(issues, 2, () => true, new Set(waiting.keys())).issues.map((i: { identifier: string }) => i.identifier), ["SIN-322"]);
});

test("SIN-327: Issue mit laufendem Worker oder grünem PR wartet nicht", () => {
  const issues = [inProgress("SIN-1"), inProgress("SIN-2"), inProgress("SIN-3")];
  const prs = [pr(1, "SIN-1", { ci: "failure", labels: ["needs-human"] }), pr(2, "SIN-2", { ci: "failure", labels: ["repair:1"] }), pr(3, "SIN-3", { ci: "success" })];
  const waiting = waitingIssues(issues, prs, ["SIN-1"]);
  assert.deepEqual([...waiting.keys()], []); // SIN-1 hat Worker, SIN-2 repariert noch, SIN-3 grün
  assert.equal(waitReason(pr(4, "SIN-4", { labels: ["risk:high"] })), "wartet auf Freigabe (risk:high)");
  assert.equal(waitReason(pr(4, "SIN-4", { labels: ["risk:high", "freigegeben"] })), null);
  assert.equal(waitReason(pr(4, "SIN-4", { draft: true, mergeable_state: "dirty" })), null);
});

test("SIN-327: Urgent in backend, High in frontend, Rotation steht auf frontend → Urgent zuerst", () => {
  const issues = [mk("SIN-316", 2, lane("frontend")), mk("SIN-322", 1, lane("backend")), mk("SIN-330", 1, lane("content"))];
  assert.deepEqual(startOrder(issues).map((i: { identifier: string }) => i.identifier), ["SIN-322", "SIN-330", "SIN-316"]);
  assert.deepEqual(pickMany(issues, 2).issues.map((i: { identifier: string }) => i.identifier), ["SIN-322", "SIN-330"]);
});

const red = (number: number, sha: string, step = "Unit-Tests") => ({ number, sha, failures: [{ check: "build", step, lines: "Fehler: kaputt" }] });

test("SIN-327: gleicher roter Check in 2 PRs → genau ein Bug-Issue, keine Dopplung", () => {
  const { breaks } = detectGateBreaks([red(1, "a"), red(2, "b"), red(3, "c", "Lint")]);
  assert.equal(breaks.length, 1);
  const bug = breaks[0].issue as { priority: number; description: string };
  assert.equal(bug.priority, 1);
  assert.deepEqual(breaks[0].prs, [1, 2]);
  assert.match(bug.description, /build.*Unit-Tests/);
  assert.match(bug.description, /Fehler: kaputt/);
  // Das Issue gibt es schon (offen oder kürzlich erledigt) → kein zweites.
  assert.equal(detectGateBreaks([red(1, "a"), red(2, "b")], [{ title: breaks[0].title }]).breaks[0].issue, null);
  // Gleicher Code (gleicher Commit) oder nur ein PR ist kein Gate-Bruch.
  assert.equal(detectGateBreaks([red(1, "a"), red(2, "a")]).breaks.length, 0);
  assert.equal(detectGateBreaks([red(1, "a")]).breaks.length, 0);
});

test("SIN-327: Gate-Bruch sperrt Reparatur und gibt nach dem Fix frei", () => {
  const { breaks } = detectGateBreaks([red(1, "a"), red(2, "b")]);
  const open = [{ number: 1, state: "open", labels: [] }, { number: 2, state: "open", labels: ["gate-bruch"] }, { number: 3, state: "open", labels: [] }];
  assert.deepEqual(gateActions(open, breaks, true), [{ type: "gate-block", pr: 1 }]);
  // Bug gemergt (kein offenes Issue mehr), PR markiert → Label weg und main einmergen.
  assert.deepEqual(gateActions(open, [], false), [{ type: "gate-release", pr: 2 }]);
  assert.deepEqual(gateActions(open, [], true), []);
});

test("SIN-327: Loop-Status zeigt wartende PRs getrennt von Workern und legt das Gate-Bug an", () => {
  const snap = JSON.parse(readFileSync("docs/autonomy/fixture-status.json", "utf8"));
  snap.issues = [inProgress("SIN-315", { updatedAt: snap.now })];
  snap.runs = [];
  snap.prs = [{ number: 131, title: "feat: x (SIN-315)", head: "claude/sin-315", state: "open", labels: ["risk:medium", "repair:3"], created_at: snap.now, updated_at: snap.now, html_url: "u" }];
  snap.checks = { 131: { mergeGate: null, ci: "failure" } };
  snap.gateFailures = [red(131, "a"), red(132, "b")];
  const res = analyze(snap, {}, {});
  assert.match(res.body, /Wartende PRs[\s\S]*SIN-315: PR #131, CI rot, Reparatur ausgeschöpft/);
  const creates = (res.actions as { type: string; issue?: { title: string } }[]).filter((a) => a.type === "create-issue" && a.issue?.title.startsWith(GATE_PREFIX));
  assert.equal(creates.length, 1);
});

// SIN-333: nur frische Läufe, keine Dependabot-PRs, Gegencheck auf main
const fresh = (number: number, sha: string, extra: Record<string, unknown> = {}) => ({ ...red(number, sha), startedAt: "2026-10-07T05:00:00Z", author: "claude[bot]", ...extra });
const ctx = { mainSince: "2026-10-07T03:36:00Z" };

test("SIN-333: Läufe älter als der letzte Merge auf main → kein Issue", () => {
  const old = { startedAt: "2026-10-07T02:00:00Z" };
  const res = detectGateBreaks([fresh(1, "a", old), fresh(2, "b", old)], [], { ...ctx, main: { build: "failure" } });
  assert.deepEqual(res, { breaks: [], rerun: [] });
});

test("SIN-333: rote Dependabot-PRs → kein Issue", () => {
  const dep = { author: "dependabot[bot]" };
  assert.equal(detectGateBreaks([fresh(1, "a", dep), fresh(2, "b", dep)], [], { ...ctx, main: { build: "failure" } }).breaks.length, 0);
});

test("SIN-333: frische rote PRs, main grün → kein Issue, PRs werden neu angestoßen", () => {
  const res = detectGateBreaks([fresh(1, "a"), fresh(2, "b")], [], { ...ctx, main: { build: "success" } });
  assert.equal(res.breaks.length, 0);
  assert.deepEqual(res.rerun, [1, 2]);
  const open = [{ number: 1, state: "open", labels: [] }, { number: 2, state: "open", labels: [] }];
  assert.deepEqual(gateActions(open, res.breaks, false, res.rerun), [{ type: "gate-rerun", pr: 1 }, { type: "gate-rerun", pr: 2 }]);
});

test("SIN-333: frische rote PRs, main rot → genau ein Issue, keine Dublette bei offenem Issue", () => {
  const res = detectGateBreaks([fresh(1, "a"), fresh(2, "b")], [], { ...ctx, main: { build: "failure" } });
  assert.equal(res.breaks.length, 1);
  assert.ok(res.breaks[0].issue);
  assert.deepEqual(res.rerun, []);
  assert.equal(detectGateBreaks([fresh(1, "a"), fresh(2, "b")], [{ title: res.breaks[0].title }], { ...ctx, main: { build: "failure" } }).breaks[0].issue, null);
});
