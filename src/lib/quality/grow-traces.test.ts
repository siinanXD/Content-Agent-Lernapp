import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addClaudeMeasuredUsage, emptyLedger } from "./cost-guard";
import { createGrowTracer } from "./grow-traces";
import type { QuestionEval } from "./schemas";

type Aufruf = { name: string; sessionId?: string; scores: Record<string, number | boolean>; metadata?: Record<string, unknown> };

function bauen() {
  const aufrufe: Aufruf[] = [];
  const reihenfolge: string[] = [];
  const tracer = createGrowTracer({
    runId: "r1",
    courseId: "c1",
    common: { beruf: "MAF Metall", modul: "M0" },
    generatorModel: "gen",
    judgeModel: "judge",
    judgePromptVersion: "v1",
    write: async (p) => {
      aufrufe.push(p as Aufruf);
      reihenfolge.push("write");
      return `trace-${aufrufe.length}`;
    },
    flush: async () => {
      reihenfolge.push("flush");
    },
  });
  return { tracer, aufrufe, reihenfolge };
}

describe("Content-Fabrik-Traces je Schritt (SIN-380)", () => {
  it("schreibt beim Abschicken und nach dem Batch je einen Trace, mit Flush", async () => {
    const { tracer, aufrufe, reihenfolge } = bauen();
    const b = { batchId: "msgbatch_1", units: 12, label: "grow" };
    await tracer.batchGestartet(b);
    const ledger = addClaudeMeasuredUsage(emptyLedger(), { input_tokens: 1000, output_tokens: 2000 });
    await tracer.batchFertig({ ...b, ledger, geliefert: 11 });
    assert.deepEqual(reihenfolge, ["write", "flush", "write", "flush"]);
    assert.equal(aufrufe[0]!.metadata?.status, "gestartet");
    assert.equal(aufrufe[0]!.metadata?.batchId, "msgbatch_1");
    assert.equal(aufrufe[1]!.metadata?.status, "fertig");
    assert.equal(aufrufe[1]!.scores.claudeOutputTokens, 2000);
    assert.ok(typeof aufrufe[1]!.scores.costEur === "number");
    assert.equal(aufrufe[0]!.sessionId, "kurslauf-r1");
  });

  it("liefert die Trace-ID der Prüfung für langfuseTraceId", async () => {
    const { tracer, aufrufe } = bauen();
    const evals = [
      { questionId: "q1", unitId: "u1", passed: true, reasons: [], scores: { sourceFidelity: 1, uniqueness: 1, niveau: 4, language: 4, safetyFlag: false } },
    ] as unknown as QuestionEval[];
    const id = await tracer.pruefen(evals, "grow");
    assert.equal(id, "trace-1");
    assert.equal(aufrufe[0]!.scores.Bestehensquote, 1);
    assert.match(aufrufe[0]!.name, /prüfen/);
  });

  it("wirft nicht, wenn Langfuse fehlt", async () => {
    const tracer = createGrowTracer({
      runId: "r2",
      courseId: "c1",
      common: {},
      generatorModel: "gen",
      judgeModel: "judge",
      judgePromptVersion: "v1",
      write: async () => {
        throw new Error("offline");
      },
      flush: async () => {
        throw new Error("offline");
      },
    });
    assert.equal(await tracer.batchGestartet({ batchId: "b", units: 1, label: "grow" }), null);
  });
});
