import assert from "node:assert/strict";
import { test } from "node:test";
import { approvalStillValid, classifyRisk } from "../../../scripts/autonomy/risk.mjs";
import { hasOpenBlockers, pickNext } from "../../../scripts/autonomy/linear.mjs";
import { extractDefinition, validatePlan } from "../../../scripts/autonomy/planner.mjs";

const patch = (...lines: string[]) => lines.map((l) => (/^[+-]/.test(l) ? l : ` ${l}`)).join("\n");
const file = (filename: string, p = "", status = "modified") => ({ filename, patch: p, status });
const risk = (files: ReturnType<typeof file>[], extra = {}) => classifyRisk({ files, ...extra });

test("Gate: Standard ist risk:medium, auch für Workflows, Storage, Config", () => {
  for (const f of [
    ".github/workflows/ci.yml",
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
  assert.equal(risk([file(".github/workflows/x.yml", patch("-  contents: write", "+  contents: read"))]).risk, "risk:medium");
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
  const mk = (n: number) => ({ title: `T${n}`, acceptance: ["ok"], priority: 2 });
  assert.equal(validatePlan(Array.from({ length: 8 }, (_, i) => mk(i))).length, 5);
  assert.equal(validatePlan([mk(1)], ["t1"]).length, 0);
  assert.throws(() => validatePlan([{ title: "x", acceptance: [], priority: 1 }]));
  assert.throws(() => validatePlan([{ title: "x", acceptance: ["a"], priority: 9 }]));
  assert.match(validatePlan([mk(1)])[0].description, /- \[ \] ok/);
});
