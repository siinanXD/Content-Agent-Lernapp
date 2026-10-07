import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LeitnerStack } from "./leitner";
import { mostMissedAreas, nextDueAt, stageRows } from "./review-overview";

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
  });
});
