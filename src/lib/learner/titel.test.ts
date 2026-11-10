import assert from "node:assert/strict";
import test from "node:test";
import { doppelteTitel, sauberTitel } from "./titel";

test("sauberTitel entfernt Einheiten-Kennungen und Adressen (SIN-1455)", () => {
  assert.equal(sauberTitel("LF1-1-u12 Feilen"), "Feilen");
  assert.equal(sauberTitel("Sägen (LF2-3-u6)"), "Sägen");
  assert.equal(sauberTitel("Bohren https://example.org/x"), "Bohren");
  assert.equal(sauberTitel("PSA und Arbeitsplatz"), "PSA und Arbeitsplatz");
});

test("doppelteTitel meldet Mehrfachtitel ohne Groß-/Kleinschreibung", () => {
  assert.deepEqual(doppelteTitel(["A", "a", "B"]), [{ titel: "A", anzahl: 2 }]);
});
