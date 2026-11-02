import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dueItems,
  emptyStack,
  markCorrect,
  markWrong,
  practiceItems,
  applyReviewAnswer,
} from "./leitner";

describe("leitner (AP-18c)", () => {
  it("resets to stage 1 on wrong and schedules +1 day", () => {
    const now = new Date("2026-10-03T10:00:00.000Z");
    let s = markWrong(emptyStack(), "q1", now);
    assert.equal(s.items[0]!.stage, 1);
    assert.equal(s.items[0]!.dueAt, "2026-10-04T10:00:00.000Z");
    s = markCorrect(s, "q1", {}, now);
    assert.equal(s.items[0]!.stage, 2);
    assert.equal(s.items[0]!.dueAt, "2026-10-06T10:00:00.000Z");
  });

  it("removes item after stage 4 correct", () => {
    const now = new Date("2026-10-03T10:00:00.000Z");
    let s = markWrong(emptyStack(), "q1", now);
    s = markCorrect(s, "q1", {}, now);
    s = markCorrect(s, "q1", {}, now);
    s = markCorrect(s, "q1", {}, now);
    assert.equal(s.items[0]!.stage, 4);
    s = markCorrect(s, "q1", {}, now);
    assert.equal(s.items.length, 0);
  });

  it("adds anwenden corrects with long interval", () => {
    const now = new Date("2026-10-03T10:00:00.000Z");
    const s = markCorrect(emptyStack(), "qA", { anwenden: true }, now);
    assert.equal(s.items[0]!.stage, 2);
    assert.equal(dueItems(s, now).length, 0);
    assert.equal(dueItems(s, new Date("2026-10-07T10:00:00.000Z")).length, 1);
  });

  it("practiceItems nennt auch nicht fällige Fragen (SIN-1450)", () => {
    const now = new Date("2026-10-03T10:00:00.000Z");
    const s = markWrong(emptyStack(), "q1", now);
    assert.equal(dueItems(s, now).length, 0);
    assert.deepEqual(practiceItems(s).map((i) => i.questionId), ["q1"]);
  });

  it("richtig vor der Fälligkeit ändert nichts, falsch setzt auf Stufe 1", () => {
    const now = new Date("2026-10-03T10:00:00.000Z");
    let s = markWrong(emptyStack(), "q1", now);
    assert.deepEqual(applyReviewAnswer(s, "q1", true, {}, now).items, s.items);
    s = applyReviewAnswer(s, "q1", false, {}, now);
    assert.equal(s.items[0]!.stage, 1);
  });

  it("richtig am Folgetag steigt, falsch fällt auf Stufe 1", () => {
    let s = markWrong(emptyStack(), "q1", new Date("2026-10-03T10:00:00.000Z"));
    s = applyReviewAnswer(s, "q1", true, {}, new Date("2026-10-04T10:00:00.000Z"));
    assert.equal(s.items[0]!.stage, 2);
    s = applyReviewAnswer(s, "q1", true, {}, new Date("2026-10-07T10:00:00.000Z"));
    assert.equal(s.items[0]!.stage, 3);
    s = applyReviewAnswer(s, "q1", false, {}, new Date("2026-10-14T10:00:00.000Z"));
    assert.equal(s.items[0]!.stage, 1);
  });
});
