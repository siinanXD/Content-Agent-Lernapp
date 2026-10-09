import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BERUFE,
  EMPTY_ONBOARDING,
  filterBerufe,
  findBeruf,
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

test("Berufswahl: Suche filtert nur vorhandene Berufe, Monoberuf ohne Schwerpunkt", () => {
  assert.equal(BERUFE.length, 2);
  assert.deepEqual(filterBerufe("").map((b) => b.id), ["maf", "indkfl"]);
  assert.deepEqual(filterBerufe("Industriekauf").map((b) => b.id), ["indkfl"]);
  assert.deepEqual(filterBerufe("anlagen").map((b) => b.id), ["maf"]);
  assert.deepEqual(filterBerufe("Elektriker"), []);
  assert.equal(findBeruf("indkfl")?.nextRoute, "/lernpfad");
  assert.equal(findBeruf("indkfl")?.mapId, "indkfl");
  assert.equal(findBeruf("maf")?.nextRoute, "/schwerpunkt");
});

test("Erster Start ohne Einwilligung braucht Onboarding", () => {
  assert.equal(needsOnboarding(EMPTY_ONBOARDING), true);
  assert.equal(needsOnboarding({ ...EMPTY_ONBOARDING, consent: false }), false);
  assert.equal(findSchwerpunkt("textiltechnik")?.defaultMapId, "maf-textil");
});
