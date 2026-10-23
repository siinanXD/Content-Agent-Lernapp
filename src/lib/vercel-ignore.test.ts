import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ueberspringen } from "../../scripts/vercel-ignore.mjs";

test("nur Docs, Tests und Workflows: nicht bauen", () => {
  assert.equal(ueberspringen("claude/x", ["docs/LANDKARTE.md", ".github/workflows/ci.yml", "src/lib/a.test.ts"]), true);
});

test("UI-Datei: bauen", () => {
  for (const d of ["src/app/page.tsx", "src/components/a.tsx", "public/a.svg", "package.json", "next.config.ts", "src/app/globals.css"]) {
    assert.equal(ueberspringen("claude/x", ["docs/a.md", d]), false, d);
  }
});

test("main baut immer", () => {
  assert.equal(ueberspringen("main", ["docs/a.md"]), false);
});

test("Diff nicht lesbar: bauen", () => {
  assert.equal(ueberspringen("claude/x", null), false);
});

test("vercel.json nutzt das Skript", () => {
  assert.match(readFileSync("vercel.json", "utf8"), /"ignoreCommand": "node scripts\/vercel-ignore\.mjs"/);
});
