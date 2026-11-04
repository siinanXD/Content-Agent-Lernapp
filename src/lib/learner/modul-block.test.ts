import assert from "node:assert/strict";
import test from "node:test";
import { loadAllCurricula } from "@/lib/content/curriculum";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import {
  deriveModuleBlock,
  mapTitlesFromCurriculum,
  pickMapTitles,
} from "./modul-block";
import { mapGeneratedToPathUnits } from "./phase-a-path";
import { completedUnitIds, withProgress } from "./path-progress";
import { groupUnitsByModule } from "./playable-path";

const unit = (id: string) =>
  ({
    id,
    title: `Einheit ${id}`,
    questions: [
      {
        id: `${id}-q1`,
        type: "single",
        prompt: "Frage?",
        choices: ["a", "b"],
        correct: "a",
        explanation: "Weil.",
        sourceUrl: "https://www.gesetze-im-internet.de/",
      },
    ],
  }) as unknown as GeneratedUnit;

test("deriveModuleBlock: Modul und Block aus der Einheiten-ID (SIN-1513)", () => {
  assert.deepEqual(deriveModuleBlock("DIG-1-u1"), { moduleId: "DIG", blockId: "DIG-1" });
  assert.deepEqual(deriveModuleBlock("APPT-1-u16"), { moduleId: "APPT", blockId: "APPT-1" });
  assert.deepEqual(deriveModuleBlock("LF1-1-u1"), { moduleId: "LF1", blockId: "LF1-1" });
  assert.deepEqual(deriveModuleBlock("M0-12-u3"), { moduleId: "M0", blockId: "M0-12" });
  assert.equal(deriveModuleBlock("unit-01"), undefined);
});

const maps = loadAllCurricula().map(mapTitlesFromCurriculum);

test("Industriekaufmann: Einheiten ohne moduleId landen in ihrem Modul, nicht in M0", () => {
  const ids = ["DIG-1-u1", "DIG-1-u2", "DIG-2-u1"];
  const titles = pickMapTitles(ids, maps);
  assert.ok(titles, "Map zum Kurs gefunden");
  const groups = groupUnitsByModule(mapGeneratedToPathUnits(ids.map(unit), titles));
  assert.deepEqual(groups.map((g) => g.moduleId), ["DIG"]);
  assert.deepEqual(groups[0]!.blocks.map((b) => [b.blockId, b.units.length]), [
    ["DIG-1", 2],
    ["DIG-2", 1],
  ]);
  assert.notEqual(groups[0]!.moduleTitle, "DIG");
  assert.notEqual(groups[0]!.blocks[0]!.blockTitle, "DIG-1");
});

test("Reihenfolge nach der Map, nicht nach Eingang (Abschlusstraining zuletzt)", () => {
  for (const map of maps) {
    const modules = map.modules;
    if (modules.length < 2) continue;
    const first = modules[0]!.id;
    const last = modules[modules.length - 1]!.id;
    const ids = [`${last}-1-u1`, `${first}-1-u1`];
    const path = mapGeneratedToPathUnits(ids.map(unit), map);
    assert.deepEqual(
      path.map((u) => u.moduleId),
      [first, last],
    );
  }
});

test("pickMapTitles wählt die Map nach den Block-Ids der Einheiten", () => {
  const titles = pickMapTitles(["APPT-1-u1", "APPT-2-u1"], maps);
  assert.ok(titles?.modules.some((m) => m.id === "APPT"));
  assert.equal(pickMapTitles(["x-u1"], maps), undefined);
});

test("Fortschritt bleibt: erledigte Einheit-IDs ändern sich durch die Ableitung nicht", () => {
  const ids = ["DIG-1-u1", "DIG-1-u2", "DIG-2-u1"];
  const titles = pickMapTitles(ids, maps);
  const path = withProgress(
    mapGeneratedToPathUnits(ids.map(unit), titles),
    completedUnitIds([
      { at: "2026-11-02T10:00:00.000Z", day: "2026-11-02", kind: "unit", unitId: "DIG-1-u1" },
    ]),
  );
  assert.deepEqual(path.map((u) => u.id), ids);
  assert.deepEqual(path.map((u) => u.status), ["done", "today", "open"]);
});
