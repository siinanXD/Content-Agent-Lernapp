import assert from "node:assert/strict";
import { test } from "node:test";
import { ratedQuestions } from "../../../scripts/autonomy/content-metrics.mjs";
import { computeQuote, failedCriteria, matchEvaluations, normKey, renderQuote, topReasons } from "../../../scripts/autonomy/quality-quote.mjs";

const questions = [
  { course_id: "c1", unit_id: "LF1-1-u1", id: "q1", type: "single" },
  { course_id: "c1", unit_id: "LF1-1-u1", id: "q2", type: "zuordnen" },
];
const ev = (question_id: string, passed: boolean, created_at: string, extra = {}) => ({
  course_id: "c1",
  unit_id: "LF1-1-u1",
  question_id,
  passed,
  quellentreue: 1,
  eindeutigkeit: 1,
  niveau: 4,
  sprache: 5,
  created_at,
  prompt_version: "v1",
  judge_model: "gpt-5.4-mini",
  ...extra,
});

test("SIN-507: normKey entfernt das Einheiten-Präfix", () => {
  assert.equal(normKey("c", "u1", "u1-q1"), "c:u1:q1");
  assert.equal(normKey("c", "u1", "q1"), "c:u1:q1");
});

test("SIN-507: beide ID-Schreibweisen derselben Frage zählen einmal, die neueste Bewertung gewinnt", () => {
  const evaluations = [
    ev("LF1-1-u1-q1", false, "2026-10-09T10:00:00Z", { niveau: 2 }),
    ev("q1", true, "2026-10-12T10:00:00Z"),
    ev("LF1-1-u1-q9", true, "2026-10-12T10:00:00Z"), // Frage gelöscht
  ];
  const m = matchEvaluations(questions, evaluations);
  assert.equal(m.latest.length, 1);
  assert.equal(m.latest[0]!.passed, true);
  assert.equal(m.doppelt, 1);
  assert.equal(m.ohneFrage, 1);
  assert.equal(m.schluessel, 3);
  assert.equal(m.ungeprueft, 1);
});

test("SIN-507: ratedQuestions nimmt bei zwei Schreibweisen die neueste, nicht die letzte in ID-Reihenfolge", () => {
  const evaluations = [
    ev("LF1-1-u1-q1", true, "2026-10-12T10:00:00Z"), // neu, sortiert vor "q1"
    ev("q1", false, "2026-10-09T10:00:00Z"),
  ];
  const r = ratedQuestions(questions, evaluations);
  assert.equal(r.bewertet.length, 1);
  assert.equal(r.bewertet[0]!.passed, true);
});

test("SIN-507: Quote, Aufschlüsselung, Kriterien und Gründe", () => {
  const evaluations = [
    ev("LF1-1-u1-q1", true, "2026-10-12T10:00:00Z"),
    ev("LF1-1-u1-q2", false, "2026-10-12T10:00:00Z", { quellentreue: 0, reason: "Quelle fehlt; Antwort unklar" }),
  ];
  const q = computeQuote({ questions, evaluations, mapOfCourse: { c1: "maf-metall" }, moduleOf: () => "LF1" });
  assert.equal(q.bewertet, 2);
  assert.equal(q.pct, 50);
  assert.deepEqual(q.nachModul, [{ key: "maf-metall/LF1", total: 2, passed: 1, pct: 50 }]);
  assert.deepEqual(q.kriterien, [["quellentreue", 1]]);
  assert.deepEqual(q.gruende, [["Antwort unklar", 1], ["Quelle fehlt", 1]]);
  assert.match(renderQuote(q, { stand: "2026-10-12" }), /1 von 2 bestanden \(50 %\)/);
});

test("SIN-507: topReasons begrenzt auf 10, failedCriteria erkennt Schwellen", () => {
  const failed = Array.from({ length: 12 }, (_, i) => ({ reason: `grund ${i}` }));
  assert.equal(topReasons(failed).length, 10);
  assert.deepEqual(failedCriteria([{ quellentreue: 1, eindeutigkeit: 1, niveau: 3, sprache: 3 }]), [["niveau", 1], ["sprache", 1]]);
});
