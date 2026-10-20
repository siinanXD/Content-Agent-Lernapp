import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRepair, renderRepair, runde } from "../../../scripts/autonomy/repair-gruende.mjs";

const row = (run_id: string, passed: boolean, niveau = 4) => ({ run_id, passed, quellentreue: 1, eindeutigkeit: 1, niveau, sprache: 4, reason: passed ? "" : "Niveau zu niedrig" });

describe("SIN-862 Reparatur-Gründe", () => {
  it("liest die Runde aus dem Suffix der run_id", () => {
    assert.equal(runde("2026-10-20-repair2"), "repair2");
    assert.equal(runde("2026-10-20-judge"), null);
  });

  it("zählt je Runde Quote und Kriterien", () => {
    const r = computeRepair([row("a-repair1", true), row("a-repair1", false, 2), row("a-repair2", false, 2), row("x", false)]);
    assert.deepEqual(r.map((x: { runde: string }) => x.runde), ["repair1", "repair2"]);
    assert.equal(r[0].bestanden, 1);
    assert.equal(r[0].quote, 50);
    assert.deepEqual(r[1].kriterien, [["niveau", 1]]);
    assert.match(renderRepair(r, { stand: "2026-10-20" }), /repair2: 0 von 1/);
  });
});
