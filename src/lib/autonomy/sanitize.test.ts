import assert from "node:assert/strict";
import { test } from "node:test";
import { escTableCell, stripComments } from "../../../scripts/autonomy/sanitize.mjs";
import { parseBody } from "../../../scripts/autonomy/steckbrief.mjs";

test("escTableCell (SIN-435): Backslash zuerst, dann | — ein End-\\ vor | bleibt wirkungslos", () => {
  assert.equal(escTableCell("a|b"), "a\\|b");
  // Eingabe a\|b → a\\\|b: erst \ zu \\, dann | zu \|
  assert.equal(escTableCell("a\\|b"), "a\\\\\\|b");
  // Eingabe endet auf \ : ohne Verdopplung würde das folgende Spaltentrennzeichen maskiert
  assert.equal(escTableCell("a\\"), "a\\\\");
  assert.equal(escTableCell(42), "42");
});

test("stripComments (SIN-435): kein <!-- bleibt übrig, auch bei verschachtelten Kommentaren", () => {
  assert.equal(stripComments("a <!-- x --> b"), "a  b");
  // Ein einzelner Durchlauf ließe „<!-- >“ stehen
  const verschachtelt = stripComments("<!<!-- x -->-- >");
  assert.doesNotMatch(verschachtelt, /<!--/);
  assert.equal(verschachtelt, " >");
  // Unvollständiger Öffner wird ebenfalls entfernt
  assert.doesNotMatch(stripComments("Text <!-- offen"), /<!--/);
});

test("parseBody (SIN-435): verschachtelter Kommentar bleibt aus dem Abschnittstext", () => {
  const sec = parseBody("## Was ändert sich\n<!<!-- versteckt -->-- >\nNeu.");
  const text = JSON.stringify(sec);
  assert.doesNotMatch(text, /versteckt/);
  assert.doesNotMatch(text, /<!--/);
  assert.match(text, /Neu\./);
});
