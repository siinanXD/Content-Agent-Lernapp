import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { loadAllCurricula } from "./curriculum";
import {
  ampel,
  buildExamSet,
  deriveVariant,
  dueReviews,
  examQuestionCount,
  leitnerNext,
  levelMixFor,
  LIMITS,
  newReview,
  parseDurationMinutes,
  sentenceCount,
  validateUnit,
  wordCount,
  writtenExamParts,
  type DidaktikUnit,
  type ExamPoolQuestion,
  type ReviewItem,
} from "./didaktik";

const FIXTURE = path.join(process.cwd(), "docs", "content", "beispiele", "maf-metall-pa-2.json");
const all = loadAllCurricula();
const metall = all.find((c) => c.id === "maf-metall")!;
const indkfl = all.find((c) => c.id === "indkfl")!;
const paModule = metall.modules.find((m) => m.id === "PA")!;
const paBlock = paModule.blocks.find((b) => b.id === "PA-2")!;

function fixture(): DidaktikUnit {
  return JSON.parse(readFileSync(FIXTURE, "utf8")) as DidaktikUnit;
}

function ctx() {
  return { curriculum: metall, module: paModule, block: paBlock };
}

describe("AP-18 didactics contract (docs/content/DIDAKTIK.md)", () => {
  it("accepts the example unit for maf-metall PA-2 in its module and block context", () => {
    const res = validateUnit(fixture(), ctx());
    assert.deepEqual(res.errors, []);
    assert.equal(res.ok, true);
  });

  it("keeps the example inside the text limits of §3", () => {
    const u = fixture();
    assert.equal(sentenceCount(u.sections.einstieg), 1);
    assert.ok(wordCount(u.sections.kern) <= LIMITS.kernWords);
    assert.ok(wordCount(u.sections.beispiel) <= LIMITS.beispielWords);
    assert.ok(wordCount(u.sections.merksatz) <= LIMITS.merksatzWords);
    assert.ok(u.image!.alt.length <= LIMITS.altChars);
    for (const q of u.questions) assert.ok(wordCount(q.explanation) <= LIMITS.explanationWords, q.id);
  });

  it("rejects units that break the template", () => {
    const tooLong = fixture();
    tooLong.sections.kern = Array(LIMITS.kernWords + 1).fill("Wort").join(" ");
    assert.ok(validateUnit(tooLong, ctx()).errors.some((e) => e.includes("kern")));

    const twoSentences = fixture();
    twoSentences.sections.einstieg = "Erster Satz. Zweiter Satz.";
    assert.ok(validateUnit(twoSentences, ctx()).errors.some((e) => e.includes("einstieg")));

    const fewQuestions = fixture();
    fewQuestions.questions = fewQuestions.questions.slice(0, 4);
    assert.ok(validateUnit(fewQuestions, ctx()).errors.some((e) => e.includes("Fragen nötig")));

    const wrongVariant = fixture();
    wrongVariant.variant = "standard";
    assert.ok(validateUnit(wrongVariant, ctx()).errors.some((e) => e.includes("verlangt variant rechnen")));

    const foreignSource = fixture();
    foreignSource.questions[0]!.sourceUrl = "https://example.org/irgendwas";
    assert.ok(validateUnit(foreignSource, ctx()).errors.some((e) => e.includes("keine Quelle der Map")));

    const wrongArea = fixture();
    wrongArea.questions[0]!.examAreas = ["WISO-1"];
    assert.ok(validateUnit(wrongArea, ctx()).errors.some((e) => e.includes("gehört nicht zum Modul")));

    const leak = fixture();
    leak.questions[1]!.prompt = "Diese IHK-Prüfungsaufgabe von 2024 lautete ...";
    assert.ok(validateUnit(leak, ctx()).errors.some((e) => e.includes("IHK")));

    const unordered = fixture();
    const q = unordered.questions;
    [q[0], q[6]] = [q[6]!, q[0]!];
    assert.ok(validateUnit(unordered, ctx()).errors.some((e) => e.includes("aufsteigend")));
  });

  it("enforces the per-type rules of §4", () => {
    const threeChoices = fixture();
    threeChoices.questions[0]!.choices = threeChoices.questions[0]!.choices!.slice(0, 3);
    assert.ok(validateUnit(threeChoices, ctx()).errors.some((e) => e.includes("genau 4 Optionen")));

    const noneOfThem = fixture();
    noneOfThem.questions[0]!.choices![3] = "Keine der genannten Antworten";
    assert.ok(validateUnit(noneOfThem, ctx()).errors.some((e) => e.includes("alle/keine")));

    const twoPairs = fixture();
    twoPairs.questions[2]!.pairs = twoPairs.questions[2]!.pairs!.slice(0, 2);
    assert.ok(validateUnit(twoPairs, ctx()).errors.some((e) => e.includes("Paare")));

    const noAblenker = fixture();
    noAblenker.questions[1]!.blanks = ["Stückzeit", "Rüstzeit"];
    assert.ok(validateUnit(noAblenker, ctx()).errors.some((e) => e.includes("Ablenker")));

    const stepsMismatch = fixture();
    stepsMismatch.questions[4]!.correct = (stepsMismatch.questions[4]!.correct as string[]).slice(0, 5);
    assert.ok(validateUnit(stepsMismatch, ctx()).errors.some((e) => e.includes("Reihenfolge")));

    const noNumber = fixture();
    noNumber.questions[5]!.correct = "lange";
    assert.ok(validateUnit(noNumber, ctx()).errors.some((e) => e.includes("Zahlenergebnis")));
  });

  it("requires safetyFlag for sicherheit and licence/alt/longDescription for images (§7)", () => {
    const sicher = fixture();
    sicher.variant = "sicherheit";
    const res = validateUnit(sicher); // no block context, so only the flag rule fires
    assert.ok(res.errors.some((e) => e.includes("safetyFlag")));

    const noLicense = fixture();
    noLicense.image!.source.license = "";
    assert.ok(validateUnit(noLicense, ctx()).errors.some((e) => e.includes("license")));

    const longAlt = fixture();
    longAlt.image!.alt = "x".repeat(LIMITS.altChars + 1);
    assert.ok(validateUnit(longAlt, ctx()).errors.some((e) => e.includes("alt")));

    const schema = fixture();
    schema.image!.kind = "schema";
    assert.ok(validateUnit(schema, ctx()).errors.some((e) => e.includes("longDescription")));
    schema.image!.longDescription = "Die Anlage besteht aus Zuführung, Bearbeitungsstation und Ablage.";
    assert.equal(validateUnit(schema, ctx()).ok, true);
  });

  it("derives the variant from the block flags and wording", () => {
    assert.equal(deriveVariant(paBlock), "rechnen");
    const safety = metall.modules.find((m) => m.id === "M0")!.blocks.find((b) => b.id === "M0-3")!;
    assert.equal(deriveVariant(safety), "sicherheit");
    const standard = metall.modules.find((m) => m.id === "M0")!.blocks.find((b) => b.id === "M0-1")!;
    assert.equal(deriveVariant(standard), "standard");
    assert.equal(deriveVariant({ title: "Anlagen anfahren und abfahren", topics: ["Inbetriebnahme Schritt für Schritt"] }), "ablauf");
    assert.equal(deriveVariant({ title: "Rüstzeit berechnen", topics: [], rechnen: true, safety: true }), "sicherheit");
  });

  it("scales the 2/3/2 level mix to 5–8 questions", () => {
    assert.deepEqual(levelMixFor(5), { erinnern: 1, verstehen: 3, anwenden: 1 });
    assert.deepEqual(levelMixFor(6), { erinnern: 2, verstehen: 2, anwenden: 2 });
    assert.deepEqual(levelMixFor(7), { erinnern: 2, verstehen: 3, anwenden: 2 });
    assert.deepEqual(levelMixFor(8), { erinnern: 2, verstehen: 4, anwenden: 2 });
    for (const n of [5, 6, 7, 8]) {
      const m = levelMixFor(n);
      assert.equal(m.erinnern + m.verstehen + m.anwenden, n);
    }
  });

  it("walks the Leitner stages 1 → 3 → 7 → 14 days and retires after stage 4", () => {
    const now = new Date("2026-10-03T08:00:00.000Z");
    let item: ReviewItem | null = newReview("q1", now);
    assert.equal(item.stage, 1);
    assert.equal(item.dueAt, "2026-10-04T08:00:00.000Z");
    item = leitnerNext(item, true, now);
    assert.equal(item!.stage, 2);
    assert.equal(item!.dueAt, "2026-10-06T08:00:00.000Z");
    item = leitnerNext(item!, true, now);
    assert.equal(item!.dueAt, "2026-10-10T08:00:00.000Z");
    item = leitnerNext(item!, true, now);
    assert.equal(item!.stage, 4);
    assert.equal(item!.dueAt, "2026-10-17T08:00:00.000Z");
    assert.equal(leitnerNext(item!, true, now), null, "stage 4 correct retires the item");
    const back = leitnerNext(item!, false, now)!;
    assert.equal(back.stage, 1);

    const items: ReviewItem[] = Array.from({ length: 15 }, (_, i) => ({
      questionId: `q${i}`,
      stage: 1,
      dueAt: new Date(now.getTime() - i * 3_600_000).toISOString(),
    }));
    items.push({ questionId: "future", stage: 2, dueAt: "2027-01-01T00:00:00.000Z" });
    const due = dueReviews(items, now);
    assert.equal(due.length, 10, "capped at 10 per day");
    assert.equal(due[0]!.questionId, "q14", "oldest first");
    assert.ok(!due.some((d) => d.questionId === "future"));
  });

  it("maps percentages to the Ampel 80/60", () => {
    assert.equal(ampel(100), "gruen");
    assert.equal(ampel(80), "gruen");
    assert.equal(ampel(79.9), "gelb");
    assert.equal(ampel(60), "gelb");
    assert.equal(ampel(59), "rot");
  });

  it("derives written exam sets from exam.gradedParts of every map", () => {
    assert.equal(parseDurationMinutes("120 Minuten"), 120);
    assert.equal(parseDurationMinutes("höchstens 7 Stunden, bis zu 2 Aufgaben"), null);
    assert.equal(parseDurationMinutes(undefined), null);
    assert.deepEqual([60, 90, 120, 150].map(examQuestionCount), [15, 25, 30, 40]);

    const maf = writtenExamParts(metall).map((p) => [p.id, p.durationMinutes, examQuestionCount(p.durationMinutes)]);
    assert.deepEqual(maf, [["PT", 120, 30], ["PP", 60, 15], ["WISO", 60, 15]]);

    const ind = writtenExamParts(indkfl).map((p) => [p.id, p.durationMinutes, examQuestionCount(p.durationMinutes)]);
    assert.deepEqual(ind, [["T1", 90, 25], ["T2A", 150, 40], ["T2C", 60, 15]]);

    for (const c of all) {
      assert.ok(writtenExamParts(c).length >= 3, `${c.id} has written exam parts`);
    }
  });

  it("builds an exam set spread over the Gebiete, skipping recent questions", () => {
    const pt = metall.exam.gradedParts.find((p) => p.id === "PT")!;
    const areas = pt.gebiete.map((g) => g.id);
    const pool: ExamPoolQuestion[] = [];
    areas.forEach((area, ai) => {
      for (let i = 0; i < 12; i++) {
        pool.push({ id: `${area}-${String(i).padStart(2, "0")}`, type: ai === 0 && i < 4 ? "rechnen" : "auswahl", examAreas: [area] });
      }
    });
    const set = buildExamSet(metall, "PT", pool)!;
    assert.equal(set.targetCount, 30);
    assert.equal(set.questionIds.length, 30);
    assert.equal(new Set(set.questionIds).size, 30);
    assert.equal(set.durationMinutes, 120);
    for (const area of areas) assert.equal(set.byArea[area], 5, `${area} gets an equal share`);

    const recent = buildExamSet(metall, "PT", pool, { recentQuestionIds: set.questionIds })!;
    assert.ok(recent.questionIds.every((id) => !set.questionIds.includes(id)));

    const rotated = buildExamSet(metall, "PT", pool, { offset: 3 })!;
    assert.notEqual(rotated.questionIds[0], set.questionIds[0]);

    const pp = buildExamSet(metall, "PP", pool.map((q) => ({ ...q, examAreas: ["PP-a"] })), { minRechnen: 3 })!;
    assert.equal(pp.targetCount, 15);
    assert.ok(pp.questionIds.filter((id) => pool.find((q) => q.id === id)!.type === "rechnen").length >= 3);

    assert.equal(buildExamSet(metall, "PRAK", pool), null, "practical part is not simulated");
    assert.equal(buildExamSet(metall, "nope", pool), null);
  });
});
