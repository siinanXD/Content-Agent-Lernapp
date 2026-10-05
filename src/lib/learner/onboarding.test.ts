import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPTY_ONBOARDING,
  findSchwerpunkt,
  needsOnboarding,
  SCHWERPUNKTE,
} from "./onboarding";

test("5 amtliche Schwerpunkte, Default-Map ist je Schwerpunkt enthalten", () => {
  assert.equal(SCHWERPUNKTE.length, 5);
  for (const s of SCHWERPUNKTE) {
    assert.ok(s.maps.some((m) => m.mapId === s.defaultMapId), s.id);
  }
});

test("Zwei Maps nur bei Metall/Kunststoff und Druck/Papier", () => {
  const multi = SCHWERPUNKTE.filter((s) => s.maps.length > 1).map((s) => s.defaultMapId);
  assert.deepEqual(multi, ["maf-metall", "maf-druckverarbeitung"]);
});

test("Erster Start ohne Einwilligung braucht Onboarding", () => {
  assert.equal(needsOnboarding(EMPTY_ONBOARDING), true);
  assert.equal(needsOnboarding({ ...EMPTY_ONBOARDING, consent: false }), false);
  assert.equal(findSchwerpunkt("textiltechnik")?.defaultMapId, "maf-textil");
});
