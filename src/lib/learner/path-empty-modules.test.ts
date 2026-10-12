import assert from "node:assert/strict";
import test from "node:test";
import { groupUnitsByModule, PLAYABLE_UNITS, withEmptyModules } from "./playable-path";

const modules = [
  { id: "M0", title: "Querschnitt" },
  { id: "LF3", title: "Herstellen von einfachen Baugruppen" },
  { id: "PA", title: "Produktionsanlagen" },
];

test("withEmptyModules: Modul ohne Einheiten bleibt sichtbar, in Kurs-Reihenfolge (SIN-452)", () => {
  const entries = withEmptyModules(groupUnitsByModule(PLAYABLE_UNITS), modules);
  assert.deepEqual(
    entries.map((e) => [e.moduleId, e.units > 0]),
    [
      ["M0", true],
      ["LF3", false],
      ["PA", true],
      ["LF1", true],
    ],
  );
  const leer = entries.find((e) => e.moduleId === "LF3")!;
  assert.equal(leer.units, 0);
  assert.deepEqual(leer.blocks, []);
  assert.equal(leer.moduleTitle, "Herstellen von einfachen Baugruppen");
});

test("withEmptyModules: ohne Kursliste nur Module mit Einheiten", () => {
  const groups = groupUnitsByModule(PLAYABLE_UNITS);
  const entries = withEmptyModules(groups, []);
  assert.equal(entries.length, groups.length);
  assert.ok(entries.every((e) => e.units > 0));
});
