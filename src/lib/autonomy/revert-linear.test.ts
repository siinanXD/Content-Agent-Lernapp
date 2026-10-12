import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { agentOf } from "../../../scripts/autonomy/agents.mjs";
import { STEPS, buildEvent } from "../../../scripts/autonomy/leitstand.mjs";
import {
  describePlan,
  isRevertPr,
  issueOfTitle,
  main,
  originalShaOf,
  planFromData,
  roterLaufOf,
} from "../../../scripts/autonomy/revert-linear.mjs";

const ENV = { GITHUB_REPOSITORY: "o/p", NODE_ENV: "test" as const };
const FIXTURE = "docs/autonomy/fixture-revert.json";
const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const data = () => JSON.parse(readFileSync(FIXTURE, "utf8"));

test("Linear-Kennung: letzte SIN-Nummer im Revert-Titel", () => {
  assert.equal(issueOfTitle("revert: feat(fabrik): … (SIN-479) zurücknehmen (SIN-479)"), "SIN-479");
  assert.equal(issueOfTitle("revert: Fix ohne Kennung zurücknehmen"), null);
});

test("Original-SHA und roter Lauf aus dem Revert", () => {
  assert.equal(originalShaOf(`Part of SIN-479\nRevert von ${SHA}, weil die CI rot war.`), SHA);
  assert.equal(originalShaOf("Revert von kurz"), null);
  assert.equal(roterLaufOf("Fehlgeschlagener Lauf: https://github.com/o/r/actions/runs/9\n"), "https://github.com/o/r/actions/runs/9");
});

test("Nur gemergte Revert-PRs von revert-guard zählen", () => {
  const pr = data().revertPulls[0];
  assert.equal(isRevertPr(pr), true);
  assert.equal(isRevertPr({ ...pr, merged_at: null }), false);
  assert.equal(isRevertPr({ ...pr, head: { ref: "claude/sin-479" } }), false);
});

test("Erste Rücknahme: Issue auf Todo, Kommentar mit beiden PR-Links und dem roten Lauf", () => {
  const plan = planFromData(data());
  assert.ok(plan);
  assert.equal(plan.schon, false);
  assert.equal(plan.issue, "SIN-479");
  assert.equal(plan.status, "Todo");
  assert.equal(plan.label, null);
  assert.equal(plan.pr, 290);
  assert.match(plan.kommentar, /\[#290\]\(https:\/\/github\.com\/siinanXD\/Content-Agent-Lernapp\/pull\/290\)/);
  assert.match(plan.kommentar, /\[#288\]\(https:\/\/github\.com\/siinanXD\/Content-Agent-Lernapp\/pull\/288\)/);
  assert.match(plan.kommentar, /actions\/runs\/1234567/);
  assert.match(plan.kommentar, /^revert-guard: zurückgenommen/);
});

test("Zweite Rücknahme desselben Issues: needs-human statt Schlange, Status bleibt", () => {
  const d = data();
  d.issue.comments.nodes = [{ body: "revert-guard: zurückgenommen: Revert-PR [#271](https://x/pull/271) ist gemergt." }];
  const plan = planFromData(d);
  assert.equal(plan?.status, null);
  assert.equal(plan?.label, "needs-human");
  assert.match(plan?.kommentar ?? "", /zweiten Mal/);
});

test("Gleicher Revert-PR schon kommentiert: nichts zu tun (zweiter CI-Lauf)", () => {
  const d = data();
  d.issue.comments.nodes = [{ body: "revert-guard: zurückgenommen: Revert-PR [#290](https://github.com/siinanXD/Content-Agent-Lernapp/pull/290) ist gemergt." }];
  assert.deepEqual(planFromData(d), { schon: true, issue: "SIN-479" });
});

test("Kein Revert-PR am Commit, oder Issue fehlt: kein Plan", () => {
  const d = data();
  d.revertPulls = [];
  assert.equal(planFromData(d), null);
  const e = data();
  e.issue = null;
  assert.equal(planFromData(e), null);
});

test("Trockenlauf: zeigt die Änderung und ruft weder Linear noch GitHub auf", async () => {
  let calls = 0;
  const call = async () => {
    calls += 1;
    throw new Error("darf im Trockenlauf nicht aufgerufen werden");
  };
  const lines: string[] = [];
  const log = console.log;
  console.log = (...a: unknown[]) => lines.push(a.join(" "));
  try {
    await main(["--dry-run", "--sha", SHA, "--fixture", FIXTURE], ENV, {}, call as never);
  } finally {
    console.log = log;
  }
  assert.equal(calls, 0);
  const text = lines.join("\n");
  assert.match(text, /\[dry-run\] SIN-479/);
  assert.match(text, /Status: Todo/);
  assert.match(text, /Ereignis: REVERT ok, Agent pruefen, PR #290/);
  const plan = planFromData(data());
  assert.ok(plan);
  assert.match(describePlan(plan), /Label: keins/);
});

test("Ereignis REVERT: Schritt ist erlaubt und gehört zum Agenten pruefen", () => {
  assert.ok(STEPS.includes("REVERT"));
  assert.equal(agentOf("REVERT"), "pruefen");
  const e = buildEvent({ schritt: "REVERT", status: "ok", issue: "SIN-479", pr: 290 }, ENV);
  assert.equal(e.step, "REVERT");
  assert.equal(e.agent, "pruefen");
  assert.equal(e.pr, 290);
});
