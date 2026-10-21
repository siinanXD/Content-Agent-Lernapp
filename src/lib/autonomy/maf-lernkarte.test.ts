import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lernkarte } from "../../../scripts/maf-lernkarte.mjs";

const map = JSON.parse(readFileSync("docs/content/maf-metall.json", "utf8"));
const text = lernkarte(map);

test("jede Berufsbildposition hat eine Zeile mit Modul", () => {
  for (const b of map.aoBerufsbild) {
    assert.ok(text.includes(`| ${b.id} | ${b.title} |`), `Zeile fehlt: ${b.id} ${b.title}`);
  }
  assert.ok(!text.includes("**keins**"));
});

test("Lernfelder mit Industriemechaniker-Quelle stehen als offen", () => {
  assert.match(text, /offen: Industriemechaniker-RLP/);
});

test("MAF-LERNKARTE.md ist aktuell", () => {
  assert.equal(readFileSync("docs/content/MAF-LERNKARTE.md", "utf8"), text);
});
