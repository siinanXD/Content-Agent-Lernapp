import assert from "node:assert/strict";
import test from "node:test";
import { loadAllCurricula } from "@/lib/content/curriculum";
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

test("SIN-808: Frage mit Sicherheits-Flag ist ausgeblendet, auch bestanden; Bewertung mit Einheiten-Präfix greift", () => {
  const units = [unit("u1", ["q1", "q2", "q3"])];
  const evals = [
    { ...evaluation("c", "u1", "q1", true, "2026-10-01"), sicherheitFlag: true },
    evaluation("c", "u1", "u1-q2", false, "2026-10-01"),
    evaluation("c", "u1", "q3", true, "2026-10-01"),
  ];
  assert.deepEqual(dropDiscardedQuestions(units, evals)[0]!.questions.map((q) => q.id), ["q3"]);
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

// SIN-1541: Sicherheits-Merker blendet nur in Blöcken mit safety: true aus.
const mafMap = loadAllCurricula().find((c) => c.id === "maf-metall")!;
const blocks = mafMap.modules.flatMap((m) => m.blocks);
const sicherBlock = blocks.find((b) => b.safety === true)!.id;
const freierBlock = blocks.find((b) => b.safety !== true && b.id.startsWith("LF2-"))!.id;
const flagged = (unitId: string, passed = true): QuestionEvaluationRecord => ({
  ...evaluation("c", unitId, "q1", passed, "2026-10-01"),
  sicherheitFlag: true,
});

/** Füllt den Kurs mit je einer Einheit aller Blöcke der Metall-Map, damit sie eindeutig die passende Map ist. */
function sichtbar(unitIds: string[], evals: QuestionEvaluationRecord[]): string[] {
  const fueller = blocks.map((b) => `${b.id}-u99`);
  const units = [...unitIds, ...fueller].map((id) => unit(id, ["q1"]));
  return dropDiscardedQuestions(units, evals).map((u) => u.id).filter((id) => !fueller.includes(id));
}

test("Merker in Block ohne safety → sichtbar; in Block mit safety → ausgeblendet; nicht bestanden → ausgeblendet", () => {
  const frei = `${freierBlock}-u1`;
  const sicher = `${sicherBlock}-u1`;
  const durchgefallen = `${freierBlock}-u2`;
  const ids = [frei, sicher, durchgefallen];
  const evals = [flagged(frei), flagged(sicher), flagged(durchgefallen, false)];
  assert.deepEqual(sichtbar(ids, evals), [frei]);
});

test("Schalter SICHERHEITS_MERKER=alle: Verhalten wie vor SIN-1541 (jeder Merker blendet aus)", () => {
  const frei = `${freierBlock}-u1`;
  const vorher = process.env.SICHERHEITS_MERKER;
  process.env.SICHERHEITS_MERKER = "alle";
  try {
    assert.deepEqual(sichtbar([frei], [flagged(frei)]), []);
  } finally {
    if (vorher === undefined) delete process.env.SICHERHEITS_MERKER;
    else process.env.SICHERHEITS_MERKER = vorher;
  }
});

test("Unbekannter Block oder keine Map: Merker blendet aus (sicherer Rückfall)", () => {
  assert.deepEqual(sichtbar(["XYZ-9-u1"], [flagged("XYZ-9-u1")]), []);
  assert.deepEqual(sichtbar([`${freierBlock}-u1`, "XYZ-9-u1"], [flagged("XYZ-9-u1")]), [`${freierBlock}-u1`]);
});
