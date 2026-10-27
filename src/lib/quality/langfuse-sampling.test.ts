import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { emptyLedger } from "./cost-guard";
import { createGrowTracer } from "./grow-traces";
import { sampleRate, traceStichprobe } from "./langfuse-names";
import { toQuestionEvaluationRecords } from "./question-evaluations";
import { QUALITY_THRESHOLDS, type QuestionEval } from "./schemas";

const ids = Array.from({ length: 400 }, (_, i) => `m3-b1-u${i}`);
const unit = (id: string) => ({ id, title: "T", questions: [] }) as unknown as GeneratedUnit;
const eval1 = (unitId: string): QuestionEval => ({
  questionId: `${unitId}-q1`,
  unitId,
  passed: true,
  reasons: [],
  scores: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: false },
});

describe("Langfuse-Sampling (SIN-1048)", () => {
  it("sampleRate: leer oder ungültig → 1, sonst Wert", () => {
    assert.equal(sampleRate({}), 1);
    assert.equal(sampleRate({ LANGFUSE_SAMPLE_RATE: "abc" }), 1);
    assert.equal(sampleRate({ LANGFUSE_SAMPLE_RATE: "2" }), 1);
    assert.equal(sampleRate({ LANGFUSE_SAMPLE_RATE: "0.25" }), 0.25);
  });

  it("Massenlauf: etwa die Rate, stabil je Einheit; Reparatur und Vergleich immer", () => {
    const kept = ids.filter((id) => traceStichprobe(id, "grundbestand", 0.25));
    assert.ok(kept.length > 60 && kept.length < 140, `behalten: ${kept.length}`);
    assert.deepEqual(kept, ids.filter((id) => traceStichprobe(id, "grundbestand", 0.25)));
    assert.ok(ids.every((id) => traceStichprobe(id, "reparatur", 0)));
    assert.ok(ids.every((id) => traceStichprobe(id, "vergleich", 0)));
  });

  it("Test: Sampling greift nur für Massenläufe, Richter-Scores bleiben vollständig.", async () => {
    const prev = process.env.LANGFUSE_SAMPLE_RATE;
    process.env.LANGFUSE_SAMPLE_RATE = "0.25";
    try {
      const evals = ids.map(eval1);
      const run = async (laufArt: "grundbestand" | "reparatur") => {
        const t = createGrowTracer({
          runId: "r",
          courseId: "c",
          common: {},
          generatorModel: "g",
          judgeModel: "j",
          minBestanden: 1,
          write: async (p) => `trace-${p.einheit.id}`,
          flush: async () => undefined,
        });
        t.batchFertig(ids.map(unit), emptyLedger(), laufArt);
        const traceIds = await t.einheiten(ids.map(unit), evals);
        // Gleiche Abbildung wie scripts/content-grow.ts (judge): Zeilen für question_evaluations plus Trace-ID je Einheit.
        const rows = toQuestionEvaluationRecords({
          courseId: "c",
          passed: true,
          scores: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 5, safetyFlag: false },
          questions: evals,
          threshold: QUALITY_THRESHOLDS,
          mode: "live",
        }).map((r) => ({ ...r, langfuseTraceId: traceIds.get(r.unitId) }));
        return { traceIds, rows };
      };

      const massen = await run("grundbestand");
      assert.ok(massen.traceIds.size > 0 && massen.traceIds.size < ids.length / 2, `Traces: ${massen.traceIds.size}`);
      // Richter-Scores: eine Zeile je bewerteter Frage, auch für nicht gesampelte Einheiten, Werte unverändert.
      assert.equal(massen.rows.length, evals.length);
      assert.deepEqual(massen.rows.map((r) => r.unitId).sort(), ids.slice().sort());
      assert.ok(massen.rows.every((r) => r.niveau === 4 && r.sprache === 5 && r.passed));
      const ohneTrace = massen.rows.filter((r) => r.langfuseTraceId === undefined);
      assert.equal(ohneTrace.length, ids.length - massen.traceIds.size);
      assert.ok(ohneTrace.every((r) => !traceStichprobe(r.unitId, "grundbestand", 0.25)));

      const reparatur = await run("reparatur");
      assert.equal(reparatur.traceIds.size, ids.length);
      assert.ok(reparatur.rows.every((r) => r.langfuseTraceId === `trace-${r.unitId}`));
    } finally {
      if (prev === undefined) delete process.env.LANGFUSE_SAMPLE_RATE;
      else process.env.LANGFUSE_SAMPLE_RATE = prev;
    }
  });
});
