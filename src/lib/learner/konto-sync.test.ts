import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mergeEvents, mergeStack, stapelZuZeilen, zeilenZuStapel } from "./konto-sync";
import { markCorrect, markWrong } from "./leitner";
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

  it("Stapel: je Frage gewinnt der jüngere Eintrag, andere Fragen bleiben", () => {
    const lokal = {
      items: [
        { questionId: "q1", stage: 1 as const, dueAt: "2026-11-03T00:00:00Z", at: "2026-11-02T00:00:00Z" },
        { questionId: "q2", stage: 2 as const, dueAt: "2026-11-05T00:00:00Z", at: "2026-11-02T00:00:00Z" },
      ],
      removed: [],
    };
    const konto = {
      items: [{ questionId: "q1", stage: 2 as const, dueAt: "2026-11-06T00:00:00Z", at: "2026-11-03T00:00:00Z" }],
      removed: [],
    };
    const merged = mergeStack(lokal, konto);
    assert.equal(merged.items.length, 2);
    assert.equal(merged.items.find((i) => i.questionId === "q1")?.stage, 2);
    assert.ok(merged.items.some((i) => i.questionId === "q2"));
  });

  it("Regression: auf Stufe 4 richtig beantwortet bleibt die Frage weg, auch wenn das Konto sie noch hat", () => {
    const vorher = { items: [{ questionId: "q1", stage: 4 as const, dueAt: "2026-11-01T00:00:00Z" }], removed: [] };
    const jetzt = new Date("2026-11-04T10:00:00Z");
    const lokal = markCorrect({ ...vorher, updatedAt: "" }, "q1", {}, jetzt);
    assert.deepEqual(lokal.items, []);
    const merged = mergeStack({ items: lokal.items, removed: lokal.removed ?? [] }, vorher);
    assert.deepEqual(merged.items, []);
    assert.equal(merged.removed[0]?.questionId, "q1");
    // das zweite Gerät übernimmt die Entfernung auch dann, wenn es die Frage selbst noch führt
    assert.deepEqual(mergeStack(vorher, merged).items, []);
  });

  it("Regression: falsch in „Jetzt üben“ setzt eine nicht fällige Frage auf Stufe 1 zurück", () => {
    const konto = {
      items: [{ questionId: "q1", stage: 3 as const, dueAt: "2026-11-11T00:00:00Z", at: "2026-11-04T00:00:00Z" }],
      removed: [],
    };
    const lokal = markWrong({ items: konto.items, updatedAt: "" }, "q1", new Date("2026-11-04T12:00:00Z"));
    const merged = mergeStack({ items: lokal.items, removed: lokal.removed ?? [] }, konto);
    assert.equal(merged.items[0]?.stage, 1);
  });

  it("eine später wieder falsch beantwortete Frage kommt zurück, der alte Löschvermerk verfällt", () => {
    const entfernt = { items: [], removed: [{ questionId: "q1", at: "2026-11-04T10:00:00Z" }] };
    const wieder = { items: [{ questionId: "q1", stage: 1 as const, dueAt: "2026-11-06T00:00:00Z", at: "2026-11-05T09:00:00Z" }], removed: [] };
    const merged = mergeStack(entfernt, wieder);
    assert.equal(merged.items.length, 1);
    assert.equal(merged.removed.length, 0);
  });

  it("Konto-Zeilen: Stapel und Löschvermerke überstehen den Weg über jsonb", () => {
    const stapel = {
      items: [{ questionId: "q1", stage: 2 as const, dueAt: "2026-11-06T00:00:00Z", at: "2026-11-04T00:00:00Z" }],
      removed: [{ questionId: "q2", at: "2026-11-04T10:00:00Z" }],
    };
    assert.deepEqual(zeilenZuStapel(JSON.parse(JSON.stringify(stapelZuZeilen(stapel)))), stapel);
    assert.deepEqual(zeilenZuStapel(null), { items: [], removed: [] });
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
