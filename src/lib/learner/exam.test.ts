import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { CONTENT_DIR, loadCurriculum } from "@/lib/content/curriculum";
import { INDKFL_COURSE_ID, INDKFL_EXAM_PARTS, MAF_COURSE_ID, MAF_EXAM_PARTS } from "./exam-catalog";
import { buildExamPool, examSeconds, getExamQuestions, listExamParts, scoreByArea } from "./exam";
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
/** n Fragen im Gebiet `area`: `<area>-1` bis `<area>-n`. */
const inArea = (area: string, n: number) => Array.from({ length: n }, (_, i) => q(`${area}-${i + 1}`, [area]));

describe("exam mode (AP-18c)", () => {
  it("lists MAF graded parts with PT/PP/WISO times", () => {
    const parts = listExamParts();
    assert.equal(parts.find((p) => p.id === "PT")?.durationMinutes, 120);
    assert.equal(parts.find((p) => p.id === "PP")?.durationMinutes, 60);
    assert.equal(parts.find((p) => p.id === "WISO")?.durationMinutes, 60);
    assert.equal(parts.find((p) => p.id === "PT")?.simulated, true);
    assert.equal(parts.find((p) => p.id === "PRAK")?.simulated, false);
  });

  it("Katalog stimmt mit den freigegebenen Maps überein: Form, Dauer, Gewicht und Gebietstitel (SIN-1535)", () => {
    const maps = [
      { file: "maf-metall.json", catalog: MAF_EXAM_PARTS },
      { file: "indkfl.json", catalog: INDKFL_EXAM_PARTS },
    ];
    for (const { file, catalog } of maps) {
      const map = loadCurriculum(path.join(CONTENT_DIR, file));
      assert.deepEqual(
        catalog.map((p) => p.id),
        map.exam.gradedParts.map((p) => p.id),
        file,
      );
      for (const cat of catalog) {
        const m = map.exam.gradedParts.find((p) => p.id === cat.id)!;
        assert.equal(m.form, cat.form, `${file} ${cat.id}`);
        assert.equal(m.duration, cat.duration, `${file} ${cat.id} Dauer`);
        assert.equal(m.weightPercent, cat.weightPercent, `${file} ${cat.id}`);
        assert.equal(m.bereich, cat.bereich, `${file} ${cat.id}`);
        assert.deepEqual(cat.gebiete, m.gebiete, `${file} ${cat.id} Gebietstitel`);
      }
    }
  });

  it("MAF nennt die Gebiete nach § 9, nicht die alten Vorlagentitel (SIN-1535)", () => {
    const pp = listExamParts(MAF_COURSE_ID).find((p) => p.id === "PP")!;
    assert.deepEqual(
      pp.gebiete.map((g) => g.title),
      ["Arbeitsschritte", "Qualitätssicherung", "vorbeugende Instandhaltung", "Produktionsanlagen", "Übergabeprotokoll"],
    );
  });

  it("Industriekaufmann zeigt seine Teile mit den Zeiten der Map, Industriemechaniker keinen (SIN-1535)", () => {
    const kfm = listExamParts(INDKFL_COURSE_ID);
    assert.deepEqual(
      kfm.map((p) => [p.id, p.durationMinutes, p.simulated]),
      [
        ["T1", 90, true],
        ["T2A", 150, true],
        ["T2B", null, false],
        ["T2C", 60, true],
      ],
    );
    assert.equal(kfm.find((p) => p.id === "T2A")!.questionTarget, 40);
    assert.equal(kfm.find((p) => p.id === "T2C")!.questionTarget, 15);
    assert.equal(kfm.some((p) => p.id === "PT"), false);
    assert.deepEqual(listExamParts("00000000-0000-0000-0000-000000000000"), []);
  });

  it("rechnet die Zeit als Dauer x 60 Sekunden", () => {
    assert.equal(examSeconds(120), 7200);
    assert.equal(examSeconds(60), 3600);
  });

  it("nimmt jede Frage höchstens einmal und füllt nicht auf", () => {
    const units = [unitOf(...inArea("PT-a", 2)), unitOf(...inArea("PT-a", 2), q("PT-b-1", ["PT-b"]))];
    const ids = getExamQuestions("PT", units).map((x) => x.id);
    assert.deepEqual(ids, ["PT-a-1", "PT-a-2", "PT-b-1"]);
    const pool = buildExamPool("PT", units)!;
    assert.equal(pool.target, 30);
    assert.ok(pool.questions.length < pool.target);
  });

  it("zeigt nie Vorlagen: ohne Kursfragen eine leere Prüfung, Fragen ohne Gebiet zählen nicht (SIN-1536)", () => {
    assert.deepEqual(getExamQuestions("PT", []), []);
    assert.deepEqual(getExamQuestions("PT", [unitOf(q("a", []), q("b", ["ANDERS"]))]), []);
  });

  it("WISO-1 zählt nur für Wirtschafts- und Sozialkunde, nicht für Produktionstechnik (SIN-1537)", () => {
    const units = [unitOf(...inArea("WISO-1", 3), ...inArea("PT-a", 2))];
    assert.deepEqual(getExamQuestions("PT", units).map((x) => x.id), ["PT-a-1", "PT-a-2"]);
    assert.deepEqual(getExamQuestions("WISO", units).map((x) => x.id), ["WISO-1-1", "WISO-1-2", "WISO-1-3"]);
  });

  it("verteilt die Fragen nach Gewicht über die Gebiete statt die ersten zu nehmen (SIN-1536)", () => {
    const gebiete = ["PT-a", "PT-b", "PT-c", "PT-d", "PT-e", "PT-f"];
    const units = gebiete.map((a) => unitOf(...inArea(a, 40)));
    const pool = buildExamPool("PT", units, MAF_COURSE_ID)!;
    assert.equal(pool.questions.length, 30);
    const proGebiet = Object.fromEntries(pool.areas.map((a) => [a.id, a.taken]));
    // Gewicht = Einheiten je Gebiet laut Tabelle: PT-d (113) mehr als PT-e (23)
    assert.ok(proGebiet["PT-d"]! > proGebiet["PT-e"]!, JSON.stringify(proGebiet));
    assert.equal(Object.values(proGebiet).reduce((a, b) => a + b, 0), 30);
    assert.ok(Object.values(proGebiet).every((n) => n >= 1), "kein Gebiet leer");
    assert.equal(new Set(pool.questions.map((x) => x.examAreas[0])).size, 6);
  });

  it("meldet ein Gebiet mit zu wenigen Fragen mit Anzahl, ohne aufzufüllen (SIN-1536)", () => {
    const units = [unitOf(...inArea("PP-a", 30), ...inArea("PP-b", 30), ...inArea("PP-d", 1), ...inArea("PP-e", 1))];
    const pool = buildExamPool("PP", units, MAF_COURSE_ID)!;
    const c = pool.areas.find((a) => a.id === "PP-c")!;
    assert.equal(c.available, 0);
    assert.ok(c.quota > 0);
    assert.equal(pool.areas.find((a) => a.id === "PP-d")!.taken, 1);
    assert.ok(pool.areas.find((a) => a.id === "PP-e")!.quota >= 1, "auch das kleine Gebiet wird gefragt");
    assert.ok(pool.questions.length < pool.target);
    assert.equal(new Set(pool.questions.map((x) => x.id)).size, pool.questions.length);
  });

  it("Industriekaufmann: Teil 1 zieht aus T1-1 bis T1-5, nicht aus der MAF-Prüfung (SIN-1535)", () => {
    const units = [unitOf(...inArea("T1-1", 10), ...inArea("T1-3", 10), ...inArea("PT-a", 10))];
    const ids = getExamQuestions("T1", units, INDKFL_COURSE_ID).map((x) => x.id);
    assert.ok(ids.length > 0 && ids.every((id) => id.startsWith("T1-")));
    assert.equal(buildExamPool("PT", units, INDKFL_COURSE_ID), null);
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

  it("Gebiet ohne Antworten ist „nicht geprüft“, nie der Gesamtwert (SIN-1537)", () => {
    const [a, b] = scoreByArea(
      [{ questionId: "a", correct: true, examAreas: ["PT-a"] }],
      [
        { id: "PT-a", title: "technische Unterlagen" },
        { id: "PT-b", title: "Werkstoffe" },
      ],
    );
    assert.equal(a!.total, 1);
    assert.equal(b!.total, 0);
    assert.equal(b!.light, null);
    assert.equal(b!.label, "nicht geprüft");
  });

  it("Bekannte Antworten ergeben genau diese Werte je Gebiet (SIN-1537)", () => {
    const answers = [
      ...Array.from({ length: 4 }, (_, i) => ({ questionId: `p${i}`, correct: true, examAreas: ["PT-a"] })),
      ...Array.from({ length: 4 }, (_, i) => ({ questionId: `w${i}`, correct: false, examAreas: ["PT-b"] })),
      { questionId: "ws", correct: true, examAreas: ["WISO-1"] },
    ];
    const r = scoreByArea(answers, [
      { id: "PT-a", title: "A" },
      { id: "PT-b", title: "B" },
    ]);
    assert.deepEqual(r.map((x) => [x.correct, x.total]), [[4, 4], [0, 4]]);
  });

  it("offene Aufgaben zählen nicht in die Wertung (Selbstkontrolle, SIN-1538)", () => {
    const [a] = scoreByArea(
      [
        { questionId: "a", correct: true, examAreas: ["PP-a"] },
        { questionId: "o", correct: false, examAreas: ["PP-a"], open: true },
      ],
      [{ id: "PP-a", title: "Arbeitsschritte" }],
    );
    assert.deepEqual([a!.correct, a!.total], [1, 1]);
  });
});
