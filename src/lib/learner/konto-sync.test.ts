import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mergeEvents, mergeStack } from "./konto-sync";
import type { LearningEvent } from "./streak";

const ev = (at: string, unitId?: string): LearningEvent => ({
  at,
  day: at.slice(0, 10),
  kind: "unit",
  ...(unitId ? { unitId } : {}),
});

describe("Lernstand zusammenführen (SIN-1451)", () => {
  it("vereinigt Ereignisse beider Seiten ohne Doppelte, älteste zuerst", () => {
    const lokal = [ev("2026-11-02T10:00:00Z", "u1"), ev("2026-11-03T09:00:00Z", "u2")];
    const konto = [ev("2026-11-01T08:00:00Z", "u0"), ev("2026-11-02T10:00:00Z", "u1")];
    assert.deepEqual(
      mergeEvents(lokal, konto).map((e) => e.unitId),
      ["u0", "u1", "u2"],
    );
  });

  it("verliert eine offline abgeschlossene Einheit nicht, auch wenn das Konto leer ist", () => {
    const offline = [ev("2026-11-02T10:00:00Z", "u1")];
    assert.deepEqual(mergeEvents(offline, []), offline);
    assert.deepEqual(mergeEvents([], offline), offline);
  });

  it("Stapel: je Frage gewinnt der spätere Fälligkeitstermin, andere Fragen bleiben", () => {
    const lokal = [
      { questionId: "q1", stage: 1 as const, dueAt: "2026-11-03T00:00:00Z" },
      { questionId: "q2", stage: 2 as const, dueAt: "2026-11-05T00:00:00Z" },
    ];
    const konto = [{ questionId: "q1", stage: 2 as const, dueAt: "2026-11-06T00:00:00Z" }];
    const merged = mergeStack(lokal, konto);
    assert.equal(merged.length, 2);
    assert.equal(merged.find((i) => i.questionId === "q1")?.stage, 2);
    assert.ok(merged.some((i) => i.questionId === "q2"));
  });
});

describe("Migration learner_state (SIN-1451)", () => {
  const sql = readFileSync("supabase/migrations/20261102010000_sin1451_learner_state.sql", "utf8");
  it("RLS an, nur eigene Zeile, kein Zugriff für anon, kein Löschrecht", () => {
    assert.match(sql, /enable row level security/);
    assert.match(sql, /revoke all on public\.learner_state from anon, authenticated/);
    assert.match(sql, /grant select, insert, update on public\.learner_state to authenticated/);
    assert.equal((sql.match(/\(select auth\.uid\(\)\)/g) ?? []).length, 4);
    assert.doesNotMatch(sql, /grant[^;]*\bdelete\b/i);
  });
  it("ist additiv: kein drop, delete, alter ... drop", () => {
    assert.doesNotMatch(sql, /\bdrop\s+(table|column|policy|function|schema)\b/i);
    assert.doesNotMatch(sql, /^\s*delete\s+from\b/im);
    assert.doesNotMatch(sql, /\balter\s+table\b[\s\S]*?\bdrop\b/i);
  });
});
