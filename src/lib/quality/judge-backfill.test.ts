import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { fixtureJudge, type EvalItem } from "./evaluate-agent";
import { planBackfill, questionContentHash, runJudgeBackfill, type JudgeFn } from "./judge-backfill";
import { clearMockProgress, listMockJudgeRuns, mockStorage } from "@/lib/storage/mock-adapter";

const item = (n: number, prompt = `Frage ${n}?`): EvalItem => ({
  id: `u1-q${n}`,
  unitId: "u1",
  prompt,
  correct: "Not-Halt",
  explanation: "Der Not-Halt stoppt die Maschine im Gefahrenfall.",
  sourceUrl: "https://www.gesetze-im-internet.de/",
});

function countingJudge(tokensPerQuestion = 1000) {
  const calls: string[][] = [];
  const judge: JudgeFn = async (items) => {
    calls.push(items.map((i) => i.id));
    return {
      questions: fixtureJudge(items),
      usage: { prompt_tokens: items.length * tokensPerQuestion, completion_tokens: items.length * 100 },
    };
  };
  return { judge, calls };
}

describe("Bewertungslauf bestehender Fragen (SIN-260)", () => {
  afterEach(() => clearMockProgress());
  const courseId = "00000000-0000-4000-8000-000000000260";

  it("bewertet alle Fragen, speichert je Frage und ein Ledger", async () => {
    const { judge } = countingJudge();
    const items = [1, 2, 3].map((n) => item(n));
    const r = await runJudgeBackfill({ storage: mockStorage, courseId, items, judge, chunk: 2 });
    assert.equal(r.judged, 3);
    const rows = await mockStorage.listQuestionEvaluations(courseId);
    assert.equal(rows.length, 3);
    assert.ok(rows.every((x) => x.contentHash === questionContentHash(items.find((i) => i.id === x.questionId)!)));
    const runs = listMockJudgeRuns();
    assert.equal(runs.length, 1);
    assert.equal(runs[0]!.questionsJudged, 3);
    assert.ok(runs[0]!.costUsd > 0);
  });

  it("ist idempotent: zweiter Lauf bewertet nichts, geänderte Frage wird neu bewertet", async () => {
    const { judge, calls } = countingJudge();
    const items = [1, 2, 3].map((n) => item(n));
    await runJudgeBackfill({ storage: mockStorage, courseId, items, judge });
    calls.length = 0;
    const again = await runJudgeBackfill({ storage: mockStorage, courseId, items, judge });
    assert.equal(again.judged, 0);
    assert.equal(again.skipped, 3);
    assert.equal(calls.length, 0);
    assert.equal(listMockJudgeRuns().length, 1, "kein Ledger-Eintrag ohne Bewertung");

    const changed = [items[0]!, item(2, "Ganz andere Frage?"), items[2]!, item(4)];
    const third = await runJudgeBackfill({ storage: mockStorage, courseId, items: changed, judge });
    assert.deepEqual(calls.flat().sort(), ["u1-q2", "u1-q4"]);
    assert.equal(third.judged, 2);
    assert.equal(third.skipped, 2);
  });

  it("Altzeilen ohne Hash gelten als bewertet", () => {
    const items = [item(1)];
    const legacy = {
      id: "x", questionId: "u1-q1", unitId: "u1", courseId, runId: "old", judgeModel: "m", promptVersion: "p",
      quellentreue: 1, eindeutigkeit: 1, niveau: 4, sprache: 4, sicherheitFlag: false, passed: true,
      createdAt: "2026-10-01T00:00:00.000Z",
    } as const;
    assert.equal(planBackfill(items, [legacy]).pending.length, 0);
  });

  it("stoppt am Kostendeckel und protokolliert den Stopp", async () => {
    // 1 Mio. Eingabe-Token je Frage ≈ $0,75 → Deckel von 1 € greift nach 2 Fragen.
    const { judge, calls } = countingJudge(1_000_000);
    const items = [1, 2, 3, 4, 5, 6].map((n) => item(n));
    const r = await runJudgeBackfill({ storage: mockStorage, courseId, items, judge, chunk: 1, stopEur: 1 });
    assert.equal(calls.length, 2);
    assert.equal(r.remaining, 4);
    assert.equal(r.ledger.stopped, true);
    const run = listMockJudgeRuns()[0]!;
    assert.equal(run.stopped, true);
    assert.match(run.stopReason ?? "", /Kostendeckel|Budget/);
  });
});
