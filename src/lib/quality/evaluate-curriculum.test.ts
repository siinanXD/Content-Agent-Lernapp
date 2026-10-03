import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fixtureJudge, type EvalItem } from "./evaluate-agent";

describe("evaluate curriculum niveau/safety (AP-14)", () => {
  it("pre-sets safetyFlag when curriculum safety is true", () => {
    const items: EvalItem[] = [
      {
        id: "safe-1",
        unitId: "u1",
        prompt: "Was tun vor dem Einrichten?",
        correct: "Betriebsanweisung lesen",
        explanation: "Laut AO zuerst die Betriebsanweisung prüfen.",
        sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/",
        moduleId: "M0",
        blockId: "M0-3",
        year: 1,
        safety: true,
      },
    ];
    const judged = fixtureJudge(items);
    assert.equal(judged[0]!.scores.safetyFlag, true);
    assert.ok(judged[0]!.scores.niveau >= 4);
  });

  it("scores year-2 items against module niveau independently", () => {
    const items: EvalItem[] = [
      {
        id: "y2-1",
        unitId: "u2",
        prompt: "CNC-Programm prüfen",
        correct: "Nullpunkt und Werkzeugkorrektur kontrollieren",
        explanation: "Vor dem Start Programm und Korrekturen prüfen laut RLP.",
        sourceUrl: "https://www.kmk.org/fileadmin/example.pdf",
        moduleId: "LF8",
        blockId: "LF8-1",
        year: 2,
        niveauHint: "Fachbildung (Abschlussprüfungsniveau)",
        safety: false,
      },
    ];
    const judged = fixtureJudge(items);
    assert.ok(judged[0]!.scores.niveau >= 4);
    assert.equal(judged[0]!.scores.safetyFlag, false);
  });
});
