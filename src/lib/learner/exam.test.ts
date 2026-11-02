import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import { parseDurationMinutes } from "@/lib/content/didaktik";
import { MAF_EXAM_PARTS } from "./exam-catalog";
import {
  buildExamPool,
  buildExamSet,
  examSeconds,
  getExamQuestions,
  listExamParts,
  scoreByArea,
} from "./exam";
import type { PathQuestion, PathUnit } from "./playable-path";

const q = (id: string, examAreas = ["WISO-1"]): PathQuestion => ({
  id,
  type: "auswahl",
  level: "verstehen",
  prompt: id,
  choices: ["a", "b"],
  correct: "a",
  explanation: "",
  sourceUrl: "",
  examAreas,
});
const unitOf = (...questions: PathQuestion[]) => ({ questions }) as unknown as PathUnit;

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

  it("keeps client catalog in sync with maf-metall.json gradedParts", () => {
    const c = loadMafCurriculum();
    for (const cat of MAF_EXAM_PARTS) {
      const map = c.exam.gradedParts.find((p) => p.id === cat.id);
      assert.ok(map, `missing ${cat.id} in map`);
      assert.equal(map!.form, cat.form);
      assert.equal(parseDurationMinutes(map!.duration), parseDurationMinutes(cat.duration));
      assert.equal(map!.weightPercent, cat.weightPercent);
    }
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

  it("rechnet die Zeit als Dauer x 60 Sekunden", () => {
    assert.equal(examSeconds(120), 7200);
    assert.equal(examSeconds(60), 3600);
  });

  it("nimmt jede Frage höchstens einmal und füllt nicht auf", () => {
    const units = [unitOf(q("a"), q("b")), unitOf(q("a"), q("c"))];
    const ids = getExamQuestions("PT", units).map((x) => x.id);
    assert.deepEqual(ids, ["a", "b", "c"]);
    const pool = buildExamPool("PT", units)!;
    assert.equal(pool.target, 30);
    assert.ok(pool.questions.length < pool.target);
  });

  it("liefert ohne Kursfragen eine leere Prüfung statt Beispielfragen", () => {
    assert.deepEqual(getExamQuestions("PT", []), []);
    assert.equal(buildExamSet("PT", undefined, undefined, [])!.questionIds.length, 0);
  });

  it("begrenzt auf die Soll-Anzahl und ignoriert fremde Gebiete", () => {
    const many = Array.from({ length: 40 }, (_, i) => q(`q${i}`));
    assert.equal(getExamQuestions("PT", [unitOf(...many)]).length, 30);
    assert.equal(getExamQuestions("PT", [unitOf(q("x", ["ANDERS"]))]).length, 0);
  });
});
