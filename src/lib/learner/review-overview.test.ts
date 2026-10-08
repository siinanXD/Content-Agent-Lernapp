import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LeitnerStack } from "./leitner";
import { mostMissedAreas, nextDueAt, reviewTileCopy, stageRows } from "./review-overview";

const stack: LeitnerStack = {
  updatedAt: "2026-10-07T08:00:00Z",
  items: [
    { questionId: "a", stage: 1, dueAt: "2026-10-09T08:00:00Z" },
    { questionId: "b", stage: 1, dueAt: "2026-10-08T08:00:00Z" },
    { questionId: "c", stage: 3, dueAt: "2026-10-14T08:00:00Z" },
  ],
};

describe("Wiederholungsübersicht (SIN-317)", () => {
  it("zählt Fragen je Stufe mit dem Abstand in Tagen", () => {
    assert.deepEqual(
      stageRows(stack).map((r) => [r.days, r.count]),
      [
        [1, 2],
        [3, 0],
        [7, 1],
        [14, 0],
      ],
    );
  });

  it("nennt die Gebiete mit den meisten Fragen zuerst, Gleichstand nach Kennung", () => {
    assert.deepEqual(
      mostMissedAreas([["WISO-1", "TECH-2"], ["WISO-1"], ["TECH-2"], ["AA-1"]], 2),
      [
        { areaId: "TECH-2", count: 2 },
        { areaId: "WISO-1", count: 2 },
      ],
    );
  });

  it("zählt ein Gebiet je Frage nur einmal", () => {
    assert.deepEqual(mostMissedAreas([["X", "X"]]), [{ areaId: "X", count: 1 }]);
  });

  it("liefert den frühesten Fälligkeitszeitpunkt, leer = null", () => {
    assert.equal(nextDueAt(stack), "2026-10-08T08:00:00Z");
    assert.equal(nextDueAt({ items: [], updatedAt: "" }), null);
    const messy: LeitnerStack = {
      items: [
        { questionId: "x", stage: 1, dueAt: "" },
        { questionId: "y", stage: 1, dueAt: "kaputt" },
        { questionId: "z", stage: 1, dueAt: "2026-10-09T08:00:00Z" },
      ],
      updatedAt: "",
    };
    assert.equal(nextDueAt(messy), "2026-10-09T08:00:00Z");
  });
});

describe("reviewTileCopy (SIN-368)", () => {
  it("fällige Fragen: Zahl und Stapel", () => {
    assert.deepEqual(reviewTileCopy(1, 3, null), { title: "1 Frage fällig", text: "Stapel mit 3 Fragen." });
    assert.equal(reviewTileCopy(2, 1, null).text, "Stapel mit 1 Frage.");
  });

  it("nichts fällig: nennt den nächsten echten Termin", () => {
    const copy = reviewTileCopy(0, 3, nextDueAt(stack));
    assert.equal(copy.title, "Heute nichts fällig");
    assert.match(copy.text, /^Die nächsten Fragen kommen am \d{2}\.\d{2}\.\.$/);
  });

  it("leerer Stapel: kein Termin, keine erfundene Zahl", () => {
    const copy = reviewTileCopy(0, 0, null);
    assert.equal(copy.title, "Heute nichts fällig");
    assert.doesNotMatch(copy.text, /\d/);
  });
});
