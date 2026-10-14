import assert from "node:assert/strict";
import { test } from "node:test";
import { betrifftOberflaeche } from "../../../scripts/autonomy/visual-scope.mjs";

test("PR ohne Oberflächen-Änderung löst keinen Bildvergleich aus", () => {
  assert.equal(betrifftOberflaeche([".github/workflows/restore.yml", "scripts/autonomy/backup.mjs", "docs/x.md", "src/lib/a.ts"]), false);
});

test("Änderungen an src/app, src/components oder Styles lösen ihn aus", () => {
  assert.equal(betrifftOberflaeche(["src/app/page.tsx"]), true);
  assert.equal(betrifftOberflaeche(["src/components/Knopf.tsx"]), true);
  assert.equal(betrifftOberflaeche(["src/app/globals.css"]), true);
});
