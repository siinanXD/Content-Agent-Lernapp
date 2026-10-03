import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExamSet, listExamParts, scoreByArea } from "./exam";

describe("exam mode (AP-18c)", () => {
  it("lists MAF graded parts with PT/PP/WISO times", () => {
    const parts = listExamParts();
    const pt = parts.find((p) => p.id === "PT");
    const pp = parts.find((p) => p.id === "PP");
    const wiso = parts.find((p) => p.id === "WISO");
    assert.equal(pt?.durationMinutes, 120);
    assert.equal(pp?.durationMinutes, 60);
    assert.equal(wiso?.durationMinutes, 60);
    assert.equal(pt?.simulated, true);
    assert.equal(parts.find((p) => p.id === "PRAK")?.simulated, false);
  });

  it("builds exam set for PT without AI grading fields", () => {
    const set = buildExamSet("PT");
    assert.ok(set);
    assert.equal(set!.partId, "PT");
    assert.equal(set!.durationMinutes, 120);
    assert.ok(set!.questionIds.length >= 5);
  });

  it("scores traffic lights per area", () => {
    const results = scoreByArea(
      [
        { questionId: "a", correct: true, examAreas: ["PT-a"] },
        { questionId: "b", correct: true, examAreas: ["PT-a"] },
        { questionId: "c", correct: false, examAreas: ["PT-b"] },
        { questionId: "d", correct: false, examAreas: ["PT-b"] },
      ],
      [
        { id: "PT-a", title: "technische Unterlagen" },
        { id: "PT-b", title: "Werkstoffe" },
      ],
    );
    assert.equal(results[0]!.light, "green");
    assert.equal(results[1]!.light, "red");
  });
});
