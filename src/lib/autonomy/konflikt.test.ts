import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { onlyGenerated, resolveGeneratedConflicts } from "../../../scripts/autonomy/konflikt.mjs";
import { buildIndex } from "../../../scripts/decisions-index.mjs";

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "konflikt-test-"));
  git(dir, "init", "-q", "-b", "main");
  mkdirSync(join(dir, "docs", "decisions"), { recursive: true });
  writeIndex(dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  return dir;
}

const read = (dir: string) =>
  ["SIN-100-alt.md", "SIN-301-a.md", "SIN-302-b.md"].flatMap((name) => {
    try {
      return [{ name, content: readFileSync(join(dir, "docs", "decisions", name), "utf8") }];
    } catch {
      return [];
    }
  });
const writeIndex = (dir: string) => {
  writeFileSync(join(dir, "docs", "decisions", "SIN-100-alt.md"), "# Alt\n");
  writeFileSync(join(dir, "docs", "DECISIONS.md"), buildIndex(read(dir)));
};
const regen = (dir: string) => writeFileSync(join(dir, "docs", "DECISIONS.md"), buildIndex(read(dir)));

function addDecision(dir: string, branch: string, name: string, title: string) {
  git(dir, "checkout", "-q", "-b", branch, "main");
  writeFileSync(join(dir, "docs", "decisions", name), `# ${title}\n`);
  regen(dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", branch);
}

test("Konflikt: nur erzeugte Dateien zählen als ohne KI lösbar", () => {
  assert.equal(onlyGenerated(["docs/DECISIONS.md", "CHANGELOG.md"]), true);
  assert.equal(onlyGenerated(["docs/DECISIONS.md", "src/app/page.tsx"]), false);
  assert.equal(onlyGenerated([]), false);
});

test("Konflikt: zwei Branches mit verschiedenen Index-Zeilen lösen sich selbst", () => {
  const dir = repo();
  try {
    addDecision(dir, "claude/a", "SIN-301-a.md", "Entscheidung A");
    addDecision(dir, "claude/b", "SIN-302-b.md", "Entscheidung B");
    git(dir, "checkout", "-q", "main");
    git(dir, "merge", "-q", "claude/a");
    git(dir, "checkout", "-q", "claude/b");
    const r = resolveGeneratedConflicts({ cwd: dir, base: "main", git: (cwd: string, args: string[]) => git(cwd, ...args), regen });
    assert.equal(r, "resolved");
    const index = readFileSync(join(dir, "docs", "DECISIONS.md"), "utf8");
    assert.ok(!index.includes("<<<<<<<"));
    assert.ok(index.indexOf("Entscheidung B") < index.indexOf("Entscheidung A"), "sortiert: höchste Nummer zuerst");
    assert.equal(index, buildIndex(read(dir)));
    assert.equal(git(dir, "status", "--porcelain").trim(), "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Konflikt: echter Code-Konflikt bleibt unberührt (Merge abgebrochen)", () => {
  const dir = repo();
  try {
    writeFileSync(join(dir, "code.ts"), "a\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "code");
    git(dir, "checkout", "-q", "-b", "claude/c");
    writeFileSync(join(dir, "code.ts"), "branch\n");
    git(dir, "commit", "-qam", "branch");
    git(dir, "checkout", "-q", "main");
    writeFileSync(join(dir, "code.ts"), "main\n");
    git(dir, "commit", "-qam", "main");
    git(dir, "checkout", "-q", "claude/c");
    const r = resolveGeneratedConflicts({ cwd: dir, base: "main", git: (cwd: string, args: string[]) => git(cwd, ...args), regen });
    assert.equal(r, "code");
    assert.equal(readFileSync(join(dir, "code.ts"), "utf8"), "branch\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
