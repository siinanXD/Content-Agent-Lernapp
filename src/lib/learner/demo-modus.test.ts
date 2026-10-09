import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoEvents, demoSession, demoStack, isDemoMode } from "./demo-modus";
import { computeStreak } from "./streak";

const now = new Date("2026-10-09T10:00:00");

describe("Beispielmodus (SIN-408)", () => {
  it("ohne Browser ist er aus", () => {
    assert.equal(isDemoMode(), false);
  });

  it("Ereignisse ergeben eine laufende Serie von 5 Tagen", () => {
    const s = computeStreak(demoEvents(now), now);
    assert.equal(s.days, 5);
    assert.equal(s.learnedToday, true);
  });

  it("Stapel hat fällige und spätere Karten", () => {
    const stack = demoStack(now);
    assert.ok(stack.items.length > 0);
    assert.ok(stack.items.some((i) => i.dueAt <= now.toISOString()));
    assert.ok(stack.items.some((i) => i.dueAt > now.toISOString()));
  });

  it("Sitzung ist als Beispiel gekennzeichnet und rechnet stimmig", () => {
    const r = demoSession().lastResult!;
    assert.match(r.unitTitle, /Beispiel/);
    assert.ok(r.areaResults!.every((a) => a.title.startsWith("Beispiel")));
    assert.equal(
      r.correct,
      r.areaResults!.reduce((n, a) => n + a.correct, 0),
    );
  });
});
