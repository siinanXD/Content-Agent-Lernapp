import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { runEvaluateAgent } from "./evaluate-agent";
import {
  addClaudeLedger,
  addClaudeMeasuredUsage,
  emptyLedger,
  estimateUsd,
  type ClaudeUsage,
} from "./cost-guard";
import { latestPerQuestion, toQuestionEvaluationRecords } from "./question-evaluations";
import { clearMockProgress, mockStorage } from "@/lib/storage/mock-adapter";

const EVAL_ITEMS = [
  {
    id: "u1-q1",
    unitId: "u1",
    prompt: "Welche Schutzeinrichtung stoppt die Maschine sofort?",
    correct: "Not-Halt",
    explanation: "Der Not-Halt stoppt die Maschine im Gefahrenfall.",
    sourceUrl: "https://www.gesetze-im-internet.de/",
  },
  {
    id: "u1-q2",
    unitId: "u1",
    prompt: "Wer prüft die Schutzeinrichtung vor Schichtbeginn?",
    correct: "Die Bedienperson",
    explanation: "Sichtprüfung vor Schichtbeginn durch die Bedienperson.",
    sourceUrl: "https://www.dguv.de/",
  },
];

describe("question evaluations (AP-19)", () => {
  afterEach(() => clearMockProgress());

  it("writes one row per judged question and keeps history across runs", async () => {
    const courseId = crypto.randomUUID();
    for (let run = 0; run < 2; run++) {
      const result = await runEvaluateAgent({ courseId, generated: EVAL_ITEMS });
      await mockStorage.appendQuestionEvaluations(toQuestionEvaluationRecords(result));
    }
    const rows = await mockStorage.listQuestionEvaluations(courseId);
    assert.equal(rows.length, 4, "append-only: 2 questions × 2 runs");
    assert.equal(new Set(rows.map((r) => r.runId)).size, 2);
    assert.ok(rows.every((r) => r.promptVersion && r.judgeModel));
    assert.ok(rows.every((r) => r.niveau >= 1 && r.niveau <= 5));
    assert.deepEqual(
      new Set(rows.map((r) => r.questionId)),
      new Set(["u1-q1", "u1-q2"]),
    );
  });

  it("latestPerQuestion returns the newest row per question", async () => {
    const courseId = crypto.randomUUID();
    const result = await runEvaluateAgent({ courseId, generated: EVAL_ITEMS });
    const old = toQuestionEvaluationRecords(result, "2026-01-01T00:00:00.000Z");
    const recent = toQuestionEvaluationRecords(result, "2026-02-01T00:00:00.000Z");
    const latest = latestPerQuestion([...recent, ...old]);
    assert.equal(latest.length, 2);
    assert.ok(latest.every((r) => r.createdAt === "2026-02-01T00:00:00.000Z"));
  });
});

describe("Claude usage in cost ledger (AP-19)", () => {
  // Shape of result.message.usage in a Message Batches result line.
  const usage: ClaudeUsage = {
    input_tokens: 1200,
    output_tokens: 3400,
    cache_creation_input_tokens: 500,
    cache_read_input_tokens: 8000,
  };

  it("counts measured tokens > 0 including cache tokens", () => {
    const ledger = addClaudeMeasuredUsage(emptyLedger(), usage);
    assert.equal(ledger.claudeInputTokens, 1200);
    assert.equal(ledger.claudeOutputTokens, 3400);
    assert.equal(ledger.claudeCacheCreationTokens, 500);
    assert.equal(ledger.claudeCacheReadTokens, 8000);
    assert.ok(ledger.usdEstimate > 0);
  });

  it("prices cache tokens (write 1.25×, read 0.1× of input)", () => {
    const usd = estimateUsd({
      ...emptyLedger(),
      claudeCacheCreationTokens: 1e6,
      claudeCacheReadTokens: 1e6,
    });
    assert.equal(usd, 1.35); // 1.0 × 1.25 + 1.0 × 0.1
  });

  it("ignores missing/negative values and merges ledgers", () => {
    const a = addClaudeMeasuredUsage(emptyLedger(), { input_tokens: -5, output_tokens: null });
    assert.equal(a.claudeInputTokens, 0);
    const merged = addClaudeLedger(a, addClaudeMeasuredUsage(emptyLedger(), usage));
    assert.equal(merged.claudeCacheReadTokens, 8000);
    assert.equal(merged.claudeOutputTokens, 3400);
  });
});
