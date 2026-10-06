import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildPrompt, reconcile } from "../../../scripts/autonomy/linear.mjs";
import { buildIndex, main as indexMain, titleOf } from "../../../scripts/decisions-index.mjs";

const now = new Date("2026-10-05T12:00:00Z");
const issue = (identifier: string, updatedAt: string, name = "In Progress") => ({ identifier, updatedAt, state: { name } });
const out = (list: ReturnType<typeof reconcile>) => list.map((a) => `${a.issue.identifier}:${a.to}`);

test("Abgleich: In Progress ohne Worker und PR seit 15 Min → Todo (SIN-240, SIN-291)", () => {
  const issues = [
    issue("SIN-1", "2026-10-05T10:00:00Z"), // 2 h, kein Worker, kein PR → Todo
    issue("SIN-2", "2026-10-05T11:50:00Z"), // erst 10 Min → bleibt
    issue("SIN-3", "2026-10-05T10:00:00Z"), // Worker läuft → bleibt
    issue("SIN-4", "2026-10-05T10:00:00Z"), // offener PR → bleibt
    issue("SIN-5", "2026-10-05T10:00:00Z"), // gemergter PR → Done
  ];
  const prs = [
    { title: "feat: a (SIN-4)", head: "claude/sin-4", state: "open", merged: false },
    { title: "feat: b (SIN-5)", head: "claude/sin-5", state: "closed", merged: true },
  ];
  assert.deepEqual(out(reconcile(issues, prs, { runningWorkers: ["SIN-3"], now })), ["SIN-1:Todo", "SIN-5:Done"]);
});

test("Abgleich: ohne Kenntnis der Worker-Läufe wird nichts zurückgesetzt", () => {
  assert.deepEqual(out(reconcile([issue("SIN-1", "2026-10-05T08:00:00Z")], [], { now })), []);
  assert.deepEqual(out(reconcile([issue("SIN-1", "2026-10-05T08:00:00Z")], [])), []);
});

test("Worker-Prompt: Prüfungen vor dem Push, Merge von main, Entscheidungsdatei", () => {
  const p = buildPrompt({ identifier: "SIN-9", title: "T", description: "d" });
  assert.match(p, /git fetch origin main && git merge origin\/main/);
  assert.match(p, /npm ci/);
  assert.match(p, /typecheck/);
  assert.match(p, /Kein PR mit bekannten roten Checks/);
  assert.match(p, /docs\/decisions\/SIN-9-<kurz>\.md/);
});

test("Worker-Prompt: Frontend-Selbstprüfung mit Screenshots und Checkliste (SIN-275)", () => {
  const p = buildPrompt({ identifier: "SIN-9", title: "T", description: "d" });
  assert.match(p, /screenshots\.mjs/);
  assert.match(p, /web-design-guidelines/);
  assert.match(p, /Klickpfad geprüft/);
});

test("Entscheidungs-Index: eine Datei je Entscheidung, neueste zuerst, Fremddateien ignoriert", () => {
  assert.equal(titleOf("SIN-1-x.md", "text\n# Titel | mit Strich\n"), "Titel / mit Strich");
  assert.equal(titleOf("SIN-1-x.md", "ohne Überschrift"), "SIN-1-x");
  const files = [
    { name: "SIN-12-alt.md", content: "# Alt\n" },
    { name: "SIN-240-neu.md", content: "# Neu\n" },
    { name: "ARCHIV-D-01-D-47.md", content: "# Archiv\n" },
    { name: "README.md", content: "# Lies mich\n" },
  ];
  const index = buildIndex(files);
  const rows = index.split("\n").filter((l) => l.startsWith("| SIN-"));
  assert.equal(rows.length, 2);
  assert.match(rows[0], /^\| SIN-240 \| Neu \| \[SIN-240-neu\.md\]\(decisions\/SIN-240-neu\.md\)/);
  assert.ok(!index.includes("Lies mich"));
  assert.match(index, /\(decisions\/ARCHIV-D-01-D-47\.md\)/);
  assert.equal(buildIndex([...files].reverse()), index); // Reihenfolge der Eingabe egal
});

test("Entscheidungs-Index: zwei parallele PRs ändern verschiedene Dateien, der Index schreibt/prüft sich selbst", () => {
  const root = mkdtempSync(join(tmpdir(), "decisions-"));
  mkdirSync(join(root, "docs", "decisions"), { recursive: true });
  writeFileSync(join(root, "docs", "decisions", "SIN-1-a.md"), "# A\n");
  assert.equal(indexMain(["--check"], root), 1); // Index fehlt
  assert.equal(indexMain([], root), 0);
  assert.equal(indexMain(["--check"], root), 0);
  writeFileSync(join(root, "docs", "decisions", "SIN-2-b.md"), "# B\n");
  assert.equal(indexMain(["--check"], root), 1); // veraltet
  indexMain([], root);
  const text = readFileSync(join(root, "docs", "DECISIONS.md"), "utf8");
  assert.ok(text.indexOf("SIN-2-b.md") < text.indexOf("SIN-1-a.md"));
});

test("pr-gate: merge-gate ist ein echter Job, kein Check-Run (SIN-261)", () => {
  const wf = readFileSync(join(process.cwd(), ".github/workflows/pr-gate.yml"), "utf8");
  assert.match(wf, /^ {2}merge-gate:\n {4}needs: gate\n {4}if: always\(\)/m);
  assert.match(wf, /waiting: \$\{\{ steps\.decide\.outputs\.waiting \}\}/);
  assert.doesNotMatch(wf, /checks\.create/);
});
