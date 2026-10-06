import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDigest } from "../../../scripts/autonomy/digest.mjs";
import { laneOf, startOrder } from "../../../scripts/autonomy/linear.mjs";
import {
  MAX_BUNDLE,
  MODEL_HAIKU,
  MODEL_SONNET,
  appendUsage,
  bundle,
  bundleEntry,
  bundlePrompt,
  maxTurnsFor,
  modelFor,
  parseEntry,
  parseUsageMarks,
  renderWeekUsage,
  runSize,
  sizeOf,
  usageFromExecution,
  usageLine,
  weekUsage,
} from "../../../scripts/autonomy/sparen.mjs";
import { buildSteckbrief } from "../../../scripts/autonomy/steckbrief.mjs";

const issue = (n: number, labels: string[], extra = {}) => ({
  identifier: `SIN-${n}`,
  title: `Issue ${n}`,
  priority: 3,
  state: { name: "Todo", type: "unstarted" },
  labels: { nodes: labels.map((name) => ({ name })) },
  ...extra,
});

test("Größe: Label groesse:*, Standard mittel, größtes gewinnt", () => {
  assert.equal(sizeOf(issue(1, ["groesse:klein"])), "klein");
  assert.equal(sizeOf(issue(2, ["frontend"])), "mittel");
  assert.equal(sizeOf(issue(3, ["Groesse:Gross"])), "gross");
  assert.equal(sizeOf(issue(4, ["groesse:klein", "groesse:mittel"])), "mittel");
  assert.equal(runSize([issue(1, ["groesse:klein"]), issue(2, ["groesse:klein"])]), "klein");
  assert.equal(runSize([issue(1, ["groesse:klein"]), issue(2, ["groesse:gross"])]), "gross");
});

test("Modell und Runden: klein Haiku/30, mittel+groß Sonnet/80+150, Versuch 2 Sonnet", () => {
  assert.equal(modelFor("klein"), MODEL_HAIKU);
  assert.equal(modelFor("mittel"), MODEL_SONNET);
  assert.equal(modelFor("gross"), MODEL_SONNET);
  assert.equal(modelFor("klein", 2), MODEL_SONNET);
  assert.deepEqual([maxTurnsFor("klein"), maxTurnsFor("mittel"), maxTurnsFor("gross")], [30, 80, 150]);
  assert.equal(maxTurnsFor("klein", 2), 80);
});

test("Bündeln: nur klein, nur gleicher Bereich, höchstens MAX_BUNDLE, keine Doppelten", () => {
  const todo = [
    issue(10, ["groesse:klein", "bereich:doku", "backend"]),
    issue(11, ["groesse:klein", "bereich:doku", "backend"]),
    issue(12, ["groesse:klein", "bereich:index", "backend"]),
    issue(13, ["groesse:mittel", "bereich:doku", "backend"]),
    issue(14, ["groesse:klein", "bereich:doku", "backend"]),
    issue(15, ["groesse:klein", "bereich:doku", "backend"]),
    issue(16, ["groesse:klein", "bereich:doku", "backend"]),
  ];
  const [run] = bundle([todo[0]], todo, laneOf);
  assert.deepEqual(run.rest.map((i: { identifier: string }) => i.identifier), ["SIN-11", "SIN-14", "SIN-15"]);
  assert.equal(run.rest.length + 1, MAX_BUNDLE);
  assert.equal(bundleEntry(run), "SIN-10+SIN-11+SIN-14+SIN-15");
  assert.deepEqual(parseEntry("SIN-10+SIN-11"), ["SIN-10", "SIN-11"]);
  // mittel bleibt allein
  assert.deepEqual(bundle([todo[3]], todo, laneOf)[0].rest, []);
  // zwei gewählte Issues desselben Bereichs ziehen einander nicht doppelt ein
  const two = bundle([todo[0], todo[1]], todo, laneOf);
  assert.ok(!two[0].rest.some((i: { identifier: string }) => i.identifier === "SIN-11"));
  assert.match(bundlePrompt(todo[0], run.rest), /SIN-10, SIN-11, SIN-14, SIN-15/);
  assert.equal(bundlePrompt(todo[0], []), "");
});

test("Bündeln: ohne bereich-Label gilt die Spur", () => {
  const todo = [issue(20, ["groesse:klein", "frontend"]), issue(21, ["groesse:klein", "frontend"]), issue(22, ["groesse:klein", "content"])];
  const [run] = bundle([todo[0]], startOrder(todo), laneOf);
  assert.deepEqual(run.rest.map((i: { identifier: string }) => i.identifier), ["SIN-21"]);
});

const execution = JSON.stringify([
  { type: "assistant", message: { content: [{ type: "text", text: "fertig" }] } },
  {
    type: "result",
    subtype: "success",
    num_turns: 12,
    duration_ms: 185000,
    total_cost_usd: 0.4567,
    usage: { input_tokens: 1200, output_tokens: 800, cache_read_input_tokens: 5000, cache_creation_input_tokens: 900 },
  },
]);

test("Verbrauch: liest Tokens, Runden, Dauer und Kosten aus der Execution-Datei", () => {
  const u = usageFromExecution(execution);
  assert.deepEqual(u, { input: 1200, output: 800, cacheRead: 5000, cacheWrite: 900, turns: 12, durationMs: 185000, costUsd: 0.4567 });
  const line = usageLine(u, "Worker", "claude-haiku-4-5-20251001");
  assert.match(line, /Worker \(claude-haiku-4-5-20251001\): 12 Runden, 3 Min 5 s/);
  assert.match(line, /Eingabe 1\.200 · Ausgabe 800 · Cache 5\.000 gelesen \/ 900 geschrieben/);
  assert.match(line, /API-Gegenwert 0,46 \$/);
});

test("Verbrauch: kaputte oder leere Datei ist kein Fehler", () => {
  assert.equal(usageFromExecution(""), null);
  assert.equal(usageFromExecution("kein json"), null);
  assert.equal(usageFromExecution("[]"), null);
  assert.match(usageLine(null, "Worker"), /nicht lesbar/);
  assert.deepEqual(usageFromExecution('[{"type":"result"}]'), { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: null, durationMs: null, costUsd: null });
});

test("PR-Text: Verbrauch anhängen, je Lauf nur einmal, Merker lesbar", () => {
  const u = usageFromExecution(execution);
  const body = "Part of SIN-5\n\n## Was ändert sich\n- Etwas.\n";
  const one = appendUsage(body, u, { label: "Worker", model: "m", run: "100-1", issues: ["SIN-5"] });
  assert.match(one, /## Verbrauch\n- Worker \(m\)/);
  assert.equal(appendUsage(one, u, { label: "Worker", model: "m", run: "100-1" }), one);
  const two = appendUsage(one, u, { label: "Reparatur, Runde 1", model: "m", run: "100-repair1" });
  assert.equal(two.match(/## Verbrauch/g)?.length, 1);
  const marks = parseUsageMarks(two);
  assert.equal(marks.length, 2);
  assert.equal(marks[0].in, 1200);
});

test("Steckbrief zeigt den Verbrauch", () => {
  const u = usageFromExecution(execution);
  const body = appendUsage("Part of SIN-5\n\n## Was ändert sich\n- Etwas.\n", u, { label: "Worker", model: "m", run: "1" });
  const r = buildSteckbrief({
    title: "feat(app): Etwas (SIN-5)",
    body,
    risk: "risk:medium",
    reasons: [],
    approved: false,
    checks: { build: "ok", tests: "ok", a11y: "ok", prTitle: "ok" },
  });
  assert.match(r.body, /\*\*Verbrauch:\*\*\n- Worker \(m\): 12 Runden/);
  assert.ok(!r.body.includes("<!-- usage"));
  const without = buildSteckbrief({ title: "feat(app): Etwas (SIN-5)", body: "Part of SIN-5", risk: "risk:medium", reasons: [], approved: false });
  assert.ok(!without.body.includes("Verbrauch"));
});

test("Wochensumme: Summe, Tokens je PR, teuerste 3", () => {
  const mk = (usd: number, id: number) =>
    appendUsage("x", { input: 100, output: 100, cacheRead: 0, cacheWrite: 0, turns: 5, durationMs: 1000, costUsd: usd }, { label: "Worker", model: "m", run: String(id) });
  const prs = [
    { title: "feat(a): A (SIN-1)", body: mk(1, 1) },
    { title: "feat(a): B (SIN-2)", body: mk(3, 2) },
    { title: "feat(a): C (SIN-3)", body: mk(2, 3) },
    { title: "feat(a): D (SIN-4)", body: mk(0.5, 4) },
    { title: "docs(a): ohne Messung (SIN-5)", body: "nichts" },
  ];
  const w = weekUsage(prs)!;
  assert.equal(w.prs, 5);
  assert.equal(w.withUsage, 4);
  assert.equal(w.total.usd, 6.5);
  assert.equal(w.perPr.tokens, 200);
  assert.deepEqual(w.top.map((t: { id: string }) => t.id), ["SIN-2", "SIN-3", "SIN-1"]);
  assert.equal(weekUsage([{ title: "x (SIN-9)", body: "" }]), null);
  assert.match(renderWeekUsage(w).join("\n"), /Teuerste 3: SIN-2 3,00 \$, SIN-3 2,00 \$, SIN-1 1,00 \$/);
  assert.match(renderWeekUsage(null)[0], /noch keine Messwerte/);
});

test("Tages-Update zeigt Wochenverbrauch", () => {
  const w = weekUsage([{ title: "feat(a): A (SIN-1)", body: appendUsage("x", usageFromExecution(execution), { label: "Worker", model: "m", run: "1" }) }]);
  const { text } = buildDigest({ now: "2026-10-12T08:00:00Z", slot: "morgen", usageWeek: w });
  assert.match(text, /Verbrauch \(7 Tage\): 7\.900 Tokens/);
  assert.match(text, /Teuerste 3: SIN-1/);
  assert.match(buildDigest({ now: "2026-10-12T08:00:00Z", slot: "morgen" }).text, /noch keine Messwerte/);
});
