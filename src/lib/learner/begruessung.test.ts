import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { begruessung } from "./begruessung";

describe("begruessung", () => {
  it("wählt die Tageszeit und nennt den Wochentag auf Deutsch", () => {
    // 6. Oktober 2026 ist ein Dienstag (Figma 52:377: „Dienstag“, „Guten Abend“).
    assert.deepEqual(begruessung(new Date(2026, 9, 6, 20, 15)), {
      weekday: "Dienstag",
      greeting: "Guten Abend",
    });
    assert.equal(begruessung(new Date(2026, 9, 6, 7)).greeting, "Guten Morgen");
    assert.equal(begruessung(new Date(2026, 9, 6, 10, 59)).greeting, "Guten Morgen");
    assert.equal(begruessung(new Date(2026, 9, 6, 11)).greeting, "Guten Tag");
    assert.equal(begruessung(new Date(2026, 9, 6, 17, 59)).greeting, "Guten Tag");
    assert.equal(begruessung(new Date(2026, 9, 6, 18)).greeting, "Guten Abend");
  });
});
