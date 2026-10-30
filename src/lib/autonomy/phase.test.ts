import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  lastPlanAt,
  parseObserveDays,
  parsePhase,
  phaseAllowsIssue,
  phaseState,
  renderPhase,
} from "../../../scripts/autonomy/phase.mjs";
import { pickMany } from "../../../scripts/autonomy/linear.mjs";

const issue = (identifier: string, ...labels: string[]) => ({
  identifier,
  priority: 2,
  state: { type: "unstarted", name: "Todo" },
  labels: { nodes: labels.map((name) => ({ name })) },
});
const NOW = new Date("2026-10-12T06:00:00Z");

test("Phase: unbekannter Wert und fehlende Variable → bauen; OBSERVE_DAYS Standard 7", () => {
  assert.equal(parsePhase(undefined), "bauen");
  assert.equal(parsePhase("Betrieb"), "betrieb");
  assert.equal(parsePhase("unsinn"), "bauen");
  assert.equal(parseObserveDays(""), 7);
  assert.equal(parseObserveDays("0"), 7);
  assert.equal(parseObserveDays("14"), 14);
});

test("Phase: Betrieb beobachtet bis zum Ende des Fensters, dann ist geplant", () => {
  const during = phaseState({ phase: "betrieb", since: "2026-10-09T06:00:00Z", now: NOW });
  assert.equal(during.due, false);
  assert.equal(during.daysLeft, 4);
  assert.match(renderPhase(during), /noch 4 Tage bis zur nächsten Planung \(2026-10-16/);
  const over = phaseState({ phase: "betrieb", since: "2026-10-05T06:00:00Z", now: NOW });
  assert.equal(over.due, true);
  // Der letzte Wochenplan hat Vorrang vor dem Beginn des Betriebs.
  const rhythm = phaseState({ phase: "betrieb", since: "2026-09-01", lastPlan: "2026-10-10T06:00:00Z", now: NOW });
  assert.equal(rhythm.due, false);
  assert.equal(phaseState({ phase: "betrieb", observeDays: "14", since: "2026-10-05T06:00:00Z", now: NOW }).due, false);
  assert.equal(phaseState({ phase: "bauen", now: NOW }).due, true);
  assert.match(renderPhase(phaseState({ phase: "bauen" })), /bauen/);
});

test("Dispatcher: Betrieb startet nur bug, security, content, wochenplan", () => {
  assert.equal(phaseAllowsIssue("bauen", issue("SIN-1", "frontend")), true);
  assert.equal(phaseAllowsIssue("betrieb", issue("SIN-1", "frontend")), false);
  for (const l of ["bug", "Security", "content", "wochenplan"]) assert.equal(phaseAllowsIssue("betrieb", issue("SIN-2", l)), true, l);
  const todo = [issue("SIN-3", "frontend"), issue("SIN-4", "backend", "bug")];
  const picked = pickMany(todo, 2, (...args: unknown[]) => phaseAllowsIssue("betrieb", args[0] as ReturnType<typeof issue>));
  assert.deepEqual(picked.issues.map((i: { identifier: string }) => i.identifier), ["SIN-4"]);
});

test("Letzter Wochenplan: neuestes Issue mit Label wochenplan", async () => {
  let seen: unknown;
  const at = await lastPlanAt(async (_q: string, v: unknown) => {
    seen = v;
    return { issues: { nodes: [{ createdAt: "2026-10-10T06:00:00Z" }] } };
  });
  assert.equal(at, "2026-10-10T06:00:00Z");
  assert.deepEqual(seen, { l: "wochenplan" });
  assert.equal(await lastPlanAt(async () => ({ issues: { nodes: [] } })), null);
});
