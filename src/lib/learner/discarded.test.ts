import assert from "node:assert/strict";
import test from "node:test";
import type { GeneratedQuestion, GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import type { QuestionEvaluationRecord } from "@/lib/quality/question-evaluations";
import { mockStorage } from "@/lib/storage";
import { MAF_EXAM_PARTS } from "./exam-catalog";
import { getExamQuestions } from "./exam";
import { dropDiscardedQuestions } from "./discarded";
import { getQuestionById, getUnit } from "./playable-path";
import { mapGeneratedToPathUnits, setPhaseAPathUnits } from "./phase-a-path";
import { loadCoursePath } from "./shared-path";

const question = (id: string): GeneratedQuestion => ({
  id,
  type: "auswahl",
  level: "verstehen",
  prompt: `Frage ${id}`,
  choices: ["a", "b"],
  correct: "a",
  explanation: "",
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/",
  examAreas: ["WISO-1"],
});

const unit = (id: string, qs: string[], moduleId = "M0"): GeneratedUnit => ({
  id,
  title: id,
  minutes: 5,
  explanation: "",
  questions: qs.map(question),
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/",
  sourceFetchedAt: "2026-10-08",
  moduleId,
});

const evaluation = (
  courseId: string,
  unitId: string,
  questionId: string,
  passed: boolean,
  createdAt: string,
): QuestionEvaluationRecord => ({
  id: `${unitId}-${questionId}-${createdAt}`,
  courseId,
  unitId,
  questionId,
  runId: "r",
  judgeModel: "m",
  promptVersion: "p",
  quellentreue: passed ? 1 : 0,
  eindeutigkeit: 1,
  niveau: 4,
  sprache: 4,
  sicherheitFlag: false,
  passed,
  createdAt,
});

test("dropDiscardedQuestions: nur die letzte Bewertung zählt, Einheit ohne Fragen entfällt", () => {
  const units = [unit("u1", ["q1", "q2", "q3"]), unit("u2", ["q9"])];
  const evals = [
    evaluation("c", "u1", "q1", false, "2026-10-01"),
    evaluation("c", "u1", "q1", true, "2026-10-02"), // später repariert
    evaluation("c", "u1", "q2", false, "2026-10-01"),
    evaluation("c", "u2", "q9", false, "2026-10-01"),
  ];
  const out = dropDiscardedQuestions(units, evals);
  assert.deepEqual(out.map((u) => u.id), ["u1"]);
  assert.deepEqual(out[0]!.questions.map((q) => q.id), ["q1", "q3"]);
});

test("Lernpfad, Wiederholung und Prüfung liefern keine verworfene Frage", async () => {
  const units = [unit("u1", ["good1", "bad1", "good2"]), unit("u2", ["bad2"])];
  const evals = [
    evaluation("c", "u1", "bad1", false, "2026-10-01"),
    evaluation("c", "u2", "bad2", false, "2026-10-01"),
    evaluation("c", "u1", "good1", true, "2026-10-01"),
  ];
  const playable = dropDiscardedQuestions(units, evals);

  // Lernpfad: Pfad-Einheiten
  const path = mapGeneratedToPathUnits(playable);
  const pathIds = path.flatMap((u) => u.questions.map((q) => q.id));
  assert.deepEqual(pathIds, ["good1", "good2"]);

  // Wiederholung (Frage per Id aus der Leitner-Box) und Einheit
  setPhaseAPathUnits(playable);
  assert.equal(getQuestionById("bad1"), undefined);
  assert.equal(getQuestionById("bad2"), undefined);
  assert.ok(getQuestionById("good1"));
  assert.equal(getUnit("u2"), undefined);

  // Prüfung
  const part = MAF_EXAM_PARTS.find((p) => p.form === "schriftlich")!;
  const examIds = getExamQuestions(part.id).map((q) => q.id.replace(/-pad-\d+$/, ""));
  assert.ok(examIds.length > 0);
  assert.ok(!examIds.includes("bad1") && !examIds.includes("bad2"));
});

test("loadCoursePath (Kurs-Lernpfad) filtert verworfene Fragen", async () => {
  const course = await mockStorage.createCourse("SIN-395");
  await mockStorage.setGenerated(course.id, {
    id: "g",
    title: "g",
    focus: "g",
    units: [unit("u1", ["ok", "bad"])],
  });
  await mockStorage.appendQuestionEvaluations([
    evaluation(course.id, "u1", "bad", false, "2026-10-01"),
  ]);
  const path = await loadCoursePath(mockStorage, course.id);
  assert.deepEqual(path?.units.flatMap((u) => u.questions.map((q) => q.id)), ["ok"]);
});
