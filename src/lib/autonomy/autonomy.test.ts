import assert from "node:assert/strict";
import { test } from "node:test";
import { approvalStillValid, classifyRisk } from "../../../scripts/autonomy/risk.mjs";
import { claudeMayTake, isPaused, pauseUntilFromLog } from "../../../scripts/autonomy/budget.mjs";
import { hasOpenBlockers, laneOf, pickMany, pickNext, prMentions, reconcile } from "../../../scripts/autonomy/linear.mjs";
import { diffColorTokens, readNodeValues } from "../../../scripts/autonomy/figma.mjs";
import { MAX_ISSUES_PER_WEEK, extractDefinition, validatePlan } from "../../../scripts/autonomy/planner.mjs";
import {
  CHECKS,
  abnahmeIssue,
  evaluateReadiness,
  expectedFrames,
  figmaFileKey,
  inMaintenanceMode,
  isAllGreen,
  renderReadiness,
} from "../../../scripts/autonomy/readiness.mjs";

const patch = (...lines: string[]) => lines.map((l) => (/^[+-]/.test(l) ? l : ` ${l}`)).join("\n");
const file = (filename: string, p = "", status = "modified") => ({ filename, patch: p, status });
const risk = (files: ReturnType<typeof file>[], extra = {}) => classifyRisk({ files, ...extra });

test("Gate: Standard ist risk:medium, auch für Storage, Config", () => {
  for (const f of [
    "src/lib/storage/store.ts",
    "next.config.ts",
    "vercel.json",
    "docs/README.md",
    "src/app/page.tsx",
  ]) {
    assert.equal(risk([file(f, patch("+foo: bar"))]).risk, "risk:medium", f);
  }
  assert.equal(risk([file(".env.example", patch("+NEW_KEY="))]).risk, "risk:medium");
  assert.equal(
    risk([file("supabase/migrations/1_a.sql", patch("+create table if not exists t (id int);"), "added")]).risk,
    "risk:medium",
  );
});

test("Gate: jede Workflow-Änderung ist high (SIN-234)", () => {
  for (const f of [".github/workflows/ci.yml", ".github/workflows/x.yaml"]) {
    const r = risk([file(f, patch("+foo: bar"))]);
    assert.equal(r.risk, "risk:high", f);
    assert.ok(r.reasons.some((x) => x.category === "workflow"), f);
  }
  assert.equal(risk([file(".github/workflows/x.yml", patch("-  contents: write", "+  contents: read"))]).risk, "risk:high");
  assert.equal(risk([file(".github/workflows/new.yml", "", "renamed")]).risk, "risk:high");
  assert.equal(risk([file(".github/dependabot.yml", patch("+a: b"))]).risk, "risk:medium");
  assert.equal(risk([file("docs/autonomy/worker.yml", patch("+a: b"))]).risk, "risk:medium");
});

test("Gate: Secret-Leak ist high", () => {
  assert.equal(risk([], { secretLeak: true }).risk, "risk:high");
  assert.equal(risk([file(".env.local", patch("+FOO=bar"))]).risk, "risk:high");
  assert.equal(risk([file(".env.example", patch("+ANTHROPIC_API_KEY=sk-ant-abcdef"))]).risk, "risk:high");
});

test("Gate: Datenverlust in Migrationen ist high", () => {
  for (const sql of ["drop table x;", "DELETE FROM x;", "truncate x;", "alter table x drop column y;"]) {
    assert.equal(risk([file("supabase/migrations/2_b.sql", patch(`+${sql}`), "added")]).risk, "risk:high", sql);
  }
  assert.equal(risk([file("supabase/migrations/2_b.sql", patch("+-- drop table x"), "added")]).risk, "risk:medium");
  assert.equal(risk([file("supabase/migrations/1_a.sql", patch("+select 1;"), "modified")]).risk, "risk:high");
});

test("Gate: geschwächte Sicherheit ist high", () => {
  assert.equal(
    risk([file("supabase/migrations/3_c.sql", patch("+alter table t disable row level security;"), "added")]).risk,
    "risk:high",
  );
  assert.equal(
    risk([file(".github/workflows/x.yml", patch("+  contents: write", "-  contents: read"))]).risk,
    "risk:high",
  );
  assert.equal(risk([file("src/proxy.ts", patch("+x"))]).risk, "risk:high");
});

test("Gate: Zahlungen und Grundsatz-Entscheidungen sind high", () => {
  assert.equal(risk([file("src/lib/stripe/client.ts")]).risk, "risk:high");
  for (const f of ["docs/PRODUCT.md", "docs/ARCHITECTURE.md", "docs/design/tokens.md"]) {
    assert.equal(risk([file(f)]).risk, "risk:high", f);
  }
  assert.equal(risk([file("docs/DECISIONS.md")]).risk, "risk:medium");
  assert.equal(
    risk([file("package.json", patch('-    "next": "16.3.8",', '+    "sveltekit": "1.0.0",'))]).risk,
    "risk:high",
  );
  assert.equal(risk([file("package.json", patch('+    "@supabase/supabase-js": "^2.0.0",'))]).risk, "risk:high");
  assert.equal(
    risk([file("package.json", patch('-    "next": "16.3.7",', '+    "next": "16.3.8",'))]).risk,
    "risk:medium",
  );
});

test("Freigabe bleibt bei Folge-Commits, außer neuer High-Grund", () => {
  const a = risk([file("docs/PRODUCT.md")]).reasons;
  const keys = a.map((r: { key: string }) => r.key);
  assert.equal(approvalStillValid(keys, a), true);
  assert.equal(approvalStillValid(null, a), false);
  const b = risk([file("docs/PRODUCT.md"), file("src/lib/stripe/x.ts")]).reasons;
  assert.equal(approvalStillValid(keys, b), false);
  assert.equal(approvalStillValid(keys, []), true);
});

const issue = (identifier: string, priority: number, over = {}) => ({
  id: identifier,
  identifier,
  title: identifier,
  priority,
  state: { name: "Todo", type: "unstarted" },
  inverseRelations: { nodes: [] },
  ...over,
});

test("Dispatcher: höchste Priorität, ohne Blocker, nur Todo", () => {
  const blocked = issue("SIN-1", 1, {
    inverseRelations: { nodes: [{ type: "blocks", issue: { identifier: "SIN-9", state: { type: "started" } } }] },
  });
  assert.equal(hasOpenBlockers(blocked), true);
  const done = issue("SIN-2", 1, {
    inverseRelations: { nodes: [{ type: "blocks", issue: { identifier: "SIN-8", state: { type: "completed" } } }] },
  });
  assert.equal(hasOpenBlockers(done), false);
  const picked = pickNext([blocked, issue("SIN-3", 0), issue("SIN-4", 3), issue("SIN-5", 2)]);
  assert.equal(picked.issue.identifier, "SIN-5");
  assert.equal(pickNext([issue("SIN-3", 0), issue("SIN-4", 0)]).issue.identifier, "SIN-3");
});

test("Dispatcher: höchstens 2 parallel", () => {
  const running = (id: string) => issue(id, 2, { state: { name: "In Progress", type: "started" } });
  assert.equal(pickNext([running("SIN-1"), issue("SIN-3", 1)]).issue.identifier, "SIN-3");
  assert.equal(pickNext([running("SIN-1"), running("SIN-2"), issue("SIN-3", 1)]).issue, null);
});

test("Planer: Definition fertig, Plan-Prüfung, Wochenlimit", () => {
  const md = "# X\n\n## Definition fertig\n\n- a\n- b\n\n## Weiter\n\nrest";
  assert.equal(extractDefinition(md), "- a\n- b");
  assert.equal(extractDefinition("## Definition fertig\n\nletzter"), "letzter");
  const mk = (n: number, lane = "backend") => ({ lane, title: `T${n}`, acceptance: ["ok"], priority: 2 });
  assert.equal(validatePlan(Array.from({ length: 8 }, (_, i) => mk(i))).length, 3);
  assert.equal(validatePlan([mk(1)], ["t1"]).length, 0);
  // Nachfüllen (SIN-253): Obergrenze und nur Bugs
  assert.equal(validatePlan(Array.from({ length: 8 }, (_, i) => mk(i)), [], { maxIssues: 2 }).length, 2);
  assert.equal(validatePlan([mk(1), mk(2, "frontend")], [], { bugsOnly: true }).map((r: { lane: string }) => r.lane).join(), "backend");
  assert.throws(() => validatePlan([{ lane: "backend", title: "x", acceptance: [], priority: 1 }]));
  assert.throws(() => validatePlan([{ lane: "backend", title: "x", acceptance: ["a"], priority: 9 }]));
  assert.throws(() => validatePlan([{ title: "x", acceptance: ["a"], priority: 1 }]), /lane/);
  assert.match(validatePlan([mk(1)])[0].description, /- \[ \] ok/);
});

test("Planer: je Spur max. 3 (zusammen 9), 1 Design-Paket, Spur-Label", () => {
  const plan = ["frontend", "content", "backend"].flatMap((lane, l) =>
    Array.from({ length: 5 }, (_, i) => ({ lane, title: `${lane}${i}`, acceptance: ["ok"], priority: 2 + (l % 2) })),
  );
  plan.push(
    { lane: "design", title: "D1", acceptance: ["ok"], priority: 2 },
    { lane: "design", title: "D2", acceptance: ["ok"], priority: 2 },
  );
  const out = validatePlan(plan);
  assert.equal(out.filter((i) => i.lane !== "design").length, MAX_ISSUES_PER_WEEK);
  assert.equal(MAX_ISSUES_PER_WEEK, 9);
  for (const lane of ["frontend", "content", "backend"]) assert.equal(out.filter((i) => i.lane === lane).length, 3);
  assert.deepEqual(out.filter((i) => i.lane === "design").map((i) => i.title), ["D1"]);
  assert.deepEqual(out[0].labels, ["design", "frontend"]); // Design zuerst angelegt
  assert.deepEqual(out.find((i) => i.lane === "content")?.labels, ["content"]);
});

test("Planer: Frontend mit neuer Oberfläche braucht Design als Blocker", () => {
  const ui = { lane: "frontend", title: "UI", acceptance: ["ok"], priority: 2, needsDesign: true };
  assert.throws(() => validatePlan([ui]), /blockedBy/);
  assert.throws(() => validatePlan([{ ...ui, blockedBy: "Gibt es nicht" }]), /blockedBy/);
  const design = { lane: "design", title: "Frame", acceptance: ["ok"], priority: 2 };
  const out = validatePlan([ui, design].map((p) => ({ ...p, ...(p === ui ? { blockedBy: "Frame" } : {}) })));
  assert.equal(out.find((i) => i.title === "UI")?.blockedBy, "Frame");
  assert.equal(validatePlan([{ ...ui, blockedBy: "SIN-12" }])[0].blockedBy, "SIN-12");
  assert.throws(() => validatePlan([{ ...ui, lane: "backend", blockedBy: "SIN-12" }]), /nur für frontend/);
});

test("Planer: Pflege-Modus plant nur Backend und Content", () => {
  const plan = ["frontend", "content", "backend", "design"].map((lane) => ({ lane, title: lane, acceptance: ["ok"], priority: 2 }));
  assert.deepEqual(validatePlan(plan, [], { maintenance: true }).map((i) => i.lane).sort(), ["backend", "content"]);
});

test("Produktreife: Messung, Bestätigung, Tabelle, Abnahme und Pflege-Modus", () => {
  const metrics = { bestehensquote_pct: 95, sentry_kritisch: 0 };
  const expected = ["01 Start", "02 Lernpfad"];
  const base = { metrics, issues: [issue("SIN-1", 2)], expected, figma: { frames: ["01 Start", "02 Lernpfad"] } };
  const rows = evaluateReadiness(base);
  const status = (id: string) => rows.find((r) => r.id === id)?.status;
  assert.equal(status("content-quote"), "ok");
  assert.equal(status("design-issues"), "ok");
  assert.equal(status("design-figma"), "ok");
  assert.equal(status("betrieb-sentry"), "ok");
  assert.equal(status("recht-impressum"), "nicht verfügbar"); // ohne Bestätigung nie grün
  assert.equal(isAllGreen(rows), false);
  assert.match(renderReadiness(rows), /\| Content \| Bestehensquote/);

  const design = issue("SIN-2", 2, { labels: { nodes: [{ name: "design" }] } });
  assert.equal(evaluateReadiness({ ...base, issues: [design] }).find((r) => r.id === "design-issues")?.status, "offen");
  assert.equal(evaluateReadiness({ ...base, metrics: { bestehensquote_pct: 80 } }).find((r) => r.id === "content-quote")?.status, "offen");
  assert.equal(evaluateReadiness({ ...base, figma: { frames: ["01 Start"] } }).find((r) => r.id === "design-figma")?.detail, "fehlt in Figma: 02 Lernpfad");
  assert.equal(evaluateReadiness({ ...base, figma: null }).find((r) => r.id === "design-figma")?.status, "nicht verfügbar");
  assert.equal(evaluateReadiness({ ...base, issues: null }).find((r) => r.id === "design-issues")?.status, "nicht verfügbar");

  const confirmations = Object.fromEntries(CHECKS.filter((c) => !c.auto).map((c) => [c.id, { datum: "2026-10-05", beleg: "PR" }]));
  const green = evaluateReadiness({ ...base, confirmations });
  assert.equal(isAllGreen(green), true);
  assert.equal(inMaintenanceMode(green, null), true);
  assert.equal(inMaintenanceMode(green, { antwort: "freigegeben" }), false);
  assert.equal(inMaintenanceMode(rows, null), false);
  assert.equal(evaluateReadiness({ ...base, confirmations: { "recht-ki": { datum: "2026-10-05" } } }).find((r) => r.id === "recht-ki")?.status, "nicht verfügbar");
  assert.equal(abnahmeIssue(green).title, "Produkt-Abnahme MAF Metall");
  assert.deepEqual(abnahmeIssue(green).labels, ["abnahme"]);
});

test("Figma-Soll aus FIGMA.md", () => {
  const md = "| File key | `abc123` |\n| 1 | `01 Start` | Hero |\n| 2 | `02 Lernpfad` | Karte |";
  assert.deepEqual(expectedFrames(md), ["01 Start", "02 Lernpfad"]);
  assert.equal(figmaFileKey(md), "abc123");
});

test("Dispatcher: überspringt design-, abnahme- und needs-human-Issues", () => {
  const withLabel = (id: string, name: string) => issue(id, 1, { labels: { nodes: [{ name }] } });
  assert.equal(pickNext([withLabel("SIN-1", "design"), withLabel("SIN-2", "abnahme"), withLabel("SIN-3", "needs-human")]).issue, null);
  assert.equal(pickNext([withLabel("SIN-1", "design"), issue("SIN-4", 4)]).issue.identifier, "SIN-4");
});

test("Dispatcher: Spuren wechseln sich ab, keine Spur verhungert", () => {
  const lane = (id: string, name: string, p = 2) => issue(id, p, { labels: { nodes: [{ name }] } });
  const todo = [lane("SIN-1", "backend", 1), lane("SIN-2", "backend", 1), lane("SIN-3", "frontend"), lane("SIN-4", "content")];
  assert.deepEqual(pickMany(todo, 2).issues.map((i) => i.identifier), ["SIN-3", "SIN-4"]); // trotz niedrigerer Priorität
  // Läuft schon ein Frontend-Issue, kommt als Nächstes Content.
  const running = issue("SIN-9", 2, { state: { name: "In Progress", type: "started" }, labels: { nodes: [{ name: "frontend" }] }, updatedAt: "2026-10-05T10:00:00Z" });
  assert.deepEqual(pickMany([running, ...todo], 2).issues.map((i) => i.identifier), ["SIN-4"]);
  // Spur ohne Kandidat wird übersprungen.
  assert.deepEqual(pickMany([lane("SIN-1", "backend"), lane("SIN-2", "backend")], 2).issues.map((i) => i.identifier), ["SIN-1", "SIN-2"]);
  assert.equal(laneOf(issue("SIN-5", 2)), "backend"); // ohne Label
  assert.equal(pickMany([], 2).issues.length, 0);
});

test("Budget: Pause bis Reset", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  assert.equal(isPaused("2026-10-05T12:00:00Z", now), true);
  assert.equal(isPaused("2026-10-05T09:00:00Z", now), false);
  assert.equal(isPaused("", now), false);
  assert.equal(isPaused("müll", now), false);
  assert.equal(isPaused(String(Math.floor(now.getTime() / 1000) + 60), now), true);
});

test("Budget: Reset-Zeit aus der Limit-Meldung", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  assert.equal(pauseUntilFromLog("Claude AI usage limit reached|1791200000", now), new Date(1791200000 * 1000).toISOString());
  assert.equal(pauseUntilFromLog("You've hit your limit · resets 3pm (UTC)", now), "2026-10-05T15:00:00.000Z");
  assert.equal(pauseUntilFromLog("limit reached, resets 9am", now), "2026-10-06T09:00:00.000Z");
  assert.equal(pauseUntilFromLog("rate limit, bitte später", now), "2026-10-05T15:00:00.000Z");
  assert.equal(pauseUntilFromLog("Build failed", now), null);
});

test("Budget: Pause nur bei echtem Limit, nie bei max-turns oder anderen Fehlern", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  const run = (result: object, ...before: object[]) => JSON.stringify([...before, { type: "result", ...result }]);
  // Lauf #7: --max-turns erreicht, PR fertig. Das Log nennt „limit“ nebenbei, darf aber nicht pausieren.
  const chatter = { type: "user", message: "rate limit und usage limit reached stehen in docs/autonomy/README.md" };
  assert.equal(pauseUntilFromLog(run({ subtype: "error_max_turns", is_error: true, result: "Reached max turns limit (60)" }, chatter), now), null);
  assert.equal(pauseUntilFromLog(run({ subtype: "success", is_error: false, result: "fertig, usage limit reached" }), now), null);
  assert.equal(pauseUntilFromLog(run({ subtype: "error_during_execution", is_error: true, result: "Build failed" }, chatter), now), null);
  assert.equal(pauseUntilFromLog(run({ subtype: "success", is_error: true, result: "You've hit your limit · resets 3pm (UTC)" }), now), "2026-10-05T15:00:00.000Z");
  assert.equal(pauseUntilFromLog(run({ subtype: "success", is_error: true, result: "Claude AI usage limit reached|1791200000" }), now), new Date(1791200000 * 1000).toISOString());
  assert.equal(pauseUntilFromLog("[]", now), null);
});

test("Cursor zuerst: Claude nimmt nur Label, alte Todos ohne PR", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  const base = { identifier: "SIN-7", updatedAt: "2026-10-05T09:30:00Z", labels: { nodes: [] } };
  assert.equal(claudeMayTake(base, { now }), false);
  assert.equal(claudeMayTake({ ...base, updatedAt: "2026-10-05T08:00:00Z" }, { now }), true);
  assert.equal(claudeMayTake({ ...base, labels: { nodes: [{ name: "claude" }] } }, { now }), true);
  const old = { ...base, updatedAt: "2026-10-05T08:00:00Z" };
  assert.equal(claudeMayTake(old, { now, openPrs: [{ title: "feat: x (SIN-7)", head: "cursor/x-85a9" }] }), false);
  assert.equal(claudeMayTake(old, { now, openPrs: [{ title: "feat: y (SIN-70)", head: "b" }] }), true); // SIN-70 ist ein anderes Issue
});

test("Abgleich: gemergter PR → Done, ohne Merge geschlossen → Todo, sonst unverändert (SIN-237)", () => {
  const mk = (identifier: string, name = "In Progress") => ({ identifier, state: { name } });
  const issues = [mk("SIN-7"), mk("SIN-8"), mk("SIN-9"), mk("SIN-10"), mk("SIN-12", "Todo")];
  const prs = [
    { title: "feat(x): a (SIN-7)", head: "claude/a", state: "closed", merged: true },
    { title: "wip", head: "cursor/sin-8-foo-85a9", state: "closed", merged: false },
    { title: "feat: c (SIN-9)", head: "b", state: "open", merged: false },
    { title: "fix: d (SIN-9)", head: "c", state: "closed", merged: false }, // offener PR hält das Issue
    { title: "feat: e (SIN-100)", head: "claude/sin-100", state: "closed", merged: true }, // nicht SIN-10
    { title: "feat: f (SIN-12)", head: "d", state: "closed", merged: true }, // Todo bleibt unberührt
  ];
  assert.deepEqual(reconcile(issues, prs).map((a) => `${a.issue.identifier}:${a.to}`), ["SIN-7:Done", "SIN-8:Todo"]);
  assert.equal(prMentions({ title: "", head: "claude/sin-237" }, "SIN-237"), true);
  assert.equal(prMentions({ title: "x (SIN-2370)", head: "" }, "SIN-237"), false);
});

test("Planer-Dry-Run: Frontend ohne Design und mit Design unterscheidbar", () => {
  const plain = { lane: "frontend", title: "Leerzustand", acceptance: ["ok"], priority: 3 };
  const ui = { lane: "frontend", title: "Neuer Screen", acceptance: ["ok"], priority: 2, needsDesign: true, blockedBy: "SIN-12" };
  const out = validatePlan([plain, ui]);
  assert.equal(out.find((i) => i.title === "Leerzustand")?.needsDesign, false);
  assert.equal(out.find((i) => i.title === "Neuer Screen")?.needsDesign, true);
  assert.equal(validatePlan([{ ...plain, lane: "backend" }])[0].needsDesign, undefined);
});

test("Figma: Worker liest Werte über die API (Mock)", async () => {
  const node = {
    name: "Button",
    type: "FRAME",
    itemSpacing: 8,
    fills: [{ type: "SOLID", color: { r: 11 / 255, g: 95 / 255, b: 110 / 255, a: 1 } }],
    children: [{ name: "Label", type: "TEXT", characters: "Weiter" }],
  };
  const calls: string[] = [];
  const fetchMock = (async (url: string, init: { headers: Record<string, string> }) => {
    calls.push(`${url} ${init.headers["X-Figma-Token"]}`);
    return { ok: true, json: async () => ({ nodes: { "1:2": { document: node } }, document: { children: [node] } }) };
  }) as unknown as typeof fetch;
  const v = await readNodeValues("KEY", "1:2", { FIGMA_ACCESS_TOKEN: "t" }, fetchMock);
  assert.equal(v?.fills?.[0], "#0B5F6E");
  assert.equal(v?.itemSpacing, 8);
  assert.equal(v?.children?.[0].text, "Weiter");
  assert.match(calls[0], /files\/KEY\/nodes\?ids=1%3A2 t$/);
  assert.equal(await readNodeValues("KEY", "1:2", {}, fetchMock), null); // ohne Token: nicht verfügbar
  const tokens = { color: { a: { value: "#0B5F6E" }, b: { value: "#FFFFFF" } } };
  assert.deepEqual(await diffColorTokens(tokens, "KEY", { FIGMA_ACCESS_TOKEN: "t" }, fetchMock), ["b (#FFFFFF)"]);
});
