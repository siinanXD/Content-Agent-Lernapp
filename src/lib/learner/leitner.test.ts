import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dueItems,
  emptyStack,
  markCorrect,
  markWrong,
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
});
