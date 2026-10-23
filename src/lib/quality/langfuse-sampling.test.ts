import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { emptyLedger } from "./cost-guard";
import { createGrowTracer } from "./grow-traces";
import { sampleRate, traceStichprobe } from "./langfuse-names";
import type { QuestionEval } from "./schemas";

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

  it("Tracer: Massenlauf schreibt nur die Stichprobe, Reparatur alles; Bewertungen bleiben unberührt", async () => {
    const prev = process.env.LANGFUSE_SAMPLE_RATE;
    process.env.LANGFUSE_SAMPLE_RATE = "0.25";
    try {
      const geschrieben: string[] = [];
      const evals = ids.map(eval1);
      const run = async (laufArt: "grundbestand" | "reparatur") => {
        geschrieben.length = 0;
        const t = createGrowTracer({
          runId: "r",
          courseId: "c",
          common: {},
          generatorModel: "g",
          judgeModel: "j",
          minBestanden: 1,
          write: async (p) => (geschrieben.push(p.einheit.id), p.einheit.id),
          flush: async () => undefined,
        });
        t.batchFertig(ids.map(unit), emptyLedger(), laufArt);
        await t.einheiten(ids.map(unit), evals);
        return geschrieben.length;
      };
      const massen = await run("grundbestand");
      assert.ok(massen > 0 && massen < ids.length / 2);
      assert.equal(await run("reparatur"), ids.length);
      assert.equal(evals.length, ids.length); // Richter-Scores gehen unverändert nach question_evaluations
    } finally {
      if (prev === undefined) delete process.env.LANGFUSE_SAMPLE_RATE;
      else process.env.LANGFUSE_SAMPLE_RATE = prev;
    }
  });
});
