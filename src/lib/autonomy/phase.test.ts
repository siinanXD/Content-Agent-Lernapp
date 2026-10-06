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
import { buildPlannerPrompt, validatePlan } from "../../../scripts/autonomy/planner.mjs";
import { analyze } from "../../../scripts/autonomy/status.mjs";
import { pickMany } from "../../../scripts/autonomy/linear.mjs";

const plan = () => JSON.parse(readFileSync("docs/autonomy/fixture-plan.json", "utf8"));
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

test("Planer Dry-Run Fixture, bauen: unverändert, keine Phasen-Labels", () => {
  const out = validatePlan(plan(), [], { phase: phaseState({ phase: "bauen" }) });
  assert.ok(out.some((p: { lane: string }) => p.lane === "frontend"));
  assert.ok(out.every((p: { labels: string[] }) => !p.labels.includes("wochenplan") && !p.labels.includes("bug")));
});

test("Planer Dry-Run Fixture, Betrieb im Fenster: nur Fehler und Content, Backend bekommt bug", () => {
  const phase = phaseState({ phase: "betrieb", since: "2026-10-09T06:00:00Z", now: NOW });
  const out = validatePlan(plan(), [], { phase });
  assert.ok(out.length > 0);
  assert.ok(out.every((p: { lane: string }) => ["backend", "content"].includes(p.lane)));
  for (const p of out as { lane: string; labels: string[] }[]) assert.equal(p.labels.includes("bug"), p.lane === "backend");
  assert.match(buildPlannerPrompt({ definition: "", issues: [], metrics: {}, phase }), /Beobachtungsfenster läuft[\s\S]*Keine neuen Feature-Issues/);
});

test("Planer Dry-Run Fixture, Betrieb am Fensterende: höchstens 5, wichtigste zuerst, Label wochenplan", () => {
  const phase = phaseState({ phase: "betrieb", since: "2026-10-05T06:00:00Z", now: NOW });
  const many = Array.from({ length: 8 }, (_, i) => ({
    lane: ["frontend", "content", "backend"][i % 3],
    title: `Eintrag ${i}`,
    acceptance: ["x"],
    priority: i === 7 ? 1 : 3,
  }));
  const out = validatePlan(many, [], { phase }) as { title: string; priority: number; labels: string[] }[];
  assert.equal(out.length, 5);
  assert.ok(out.some((p) => p.title === "Eintrag 7"), "Priorität 1 bleibt trotz hinterer Position");
  assert.ok(out.every((p) => p.labels.includes("wochenplan")));
  const prompt = buildPlannerPrompt({ definition: "", issues: [], metrics: {}, phase });
  assert.match(prompt, /Planungstag/);
  assert.match(prompt, /höchstens 5 neue Linear-Issues, sortiert nach Wirkung/);
  assert.match(prompt, /Unter etwa 50 aktiven Nutzern/);
});

test("Planer: Design-Blocker, der dem Limit zum Opfer fällt, nimmt das Frontend-Issue mit", () => {
  const phase = phaseState({ phase: "betrieb", since: "2026-10-05T06:00:00Z", now: NOW });
  const entries = [
    { lane: "design", title: "D", acceptance: ["x"], priority: 4 },
    { lane: "frontend", title: "F", acceptance: ["x"], priority: 4, needsDesign: true, blockedBy: "D" },
    ...Array.from({ length: 5 }, (_, i) => ({ lane: ["content", "backend"][i % 2], title: `W${i}`, acceptance: ["x"], priority: 1 })),
  ];
  const out = validatePlan(entries, [], { phase }) as { title: string }[];
  assert.equal(out.length, 5);
  assert.ok(!out.some((p) => p.title === "F" || p.title === "D"));
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

test("Status: zeigt Phase und Tage bis zur nächsten Planung", () => {
  const snap = {
    ...JSON.parse(readFileSync("docs/autonomy/fixture-status.json", "utf8")),
    now: NOW.toISOString(),
    phaseEnv: { phase: "betrieb", since: "2026-10-09T06:00:00Z" },
  };
  const r = analyze(snap, {}, {});
  assert.match(r.body, /Phase: Betrieb, beobachten, noch 4 Tage/);
});
