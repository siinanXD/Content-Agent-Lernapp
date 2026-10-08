/**
 * SIN-380 — Traces der Content-Fabrik je Schritt (nicht erst am Laufende).
 * Nur Kennungen und Zahlen, keine Prompts, keine Personendaten.
 * Der Schreiber ist austauschbar, damit Tests die Aufrufe je Schritt prüfen können.
 */
import type { CostLedger } from "./cost-guard";
import { flushLangfuseOtel } from "./langfuse-otel";
import { recordEvaluationTrace } from "./langfuse-client";
import {
  kurslaufSessionId,
  pruefpunktScores,
  traceTitel,
  type TraceKontext,
} from "./langfuse-names";
import { aggregateScores, type QuestionEval } from "./schemas";

type Schreiber = typeof recordEvaluationTrace;
type PromptLink = { name: string; version: number } | null | undefined;

export type GrowTracerOptions = {
  runId: string;
  courseId: string;
  common: Omit<TraceKontext, "schritt">;
  generatorModel: string;
  judgeModel: string;
  judgePromptVersion: string;
  generatorPrompt?: PromptLink;
  judgePrompt?: PromptLink;
  write?: Schreiber;
  flush?: () => Promise<void>;
};

export type BatchInfo = { batchId: string; units: number; label: string };

export function createGrowTracer(o: GrowTracerOptions) {
  const write = o.write ?? recordEvaluationTrace;
  const flush = o.flush ?? flushLangfuseOtel;
  const sessionId = kurslaufSessionId(o.runId);

  async function schreibe(p: Parameters<Schreiber>[0]): Promise<string | null> {
    const id = await write({ ...p, courseId: o.courseId, sessionId }).catch(() => null);
    // Nach jedem Schritt senden, damit Traces auch bei Abbruch ankommen.
    await flush().catch(() => undefined);
    return id;
  }

  const erzeugen = (): TraceKontext => ({
    ...o.common,
    schritt: "erzeugen",
    modell: o.generatorModel,
    promptVersion: o.generatorPrompt ? `v${o.generatorPrompt.version}` : undefined,
  });

  return {
    /** Sofort nach dem Abschicken des Batches. */
    batchGestartet(b: BatchInfo): Promise<string | null> {
      const kontext = erzeugen();
      return schreibe({
        name: traceTitel(kontext),
        courseId: o.courseId,
        kontext,
        prompt: o.generatorPrompt ?? undefined,
        passed: true,
        scores: { Einheiten: b.units },
        metadata: { batchId: b.batchId, status: "gestartet", quelle: b.label, einheiten: b.units },
      });
    },
    /** Nach pollBatchUntilDone: Usage und Kosten des Batches. */
    batchFertig(b: BatchInfo & { ledger: CostLedger; geliefert: number }): Promise<string | null> {
      const kontext = erzeugen();
      const l = b.ledger;
      return schreibe({
        name: traceTitel(kontext),
        courseId: o.courseId,
        kontext,
        prompt: o.generatorPrompt ?? undefined,
        passed: !l.stopped,
        scores: {
          Einheiten: b.geliefert,
          claudeInputTokens: l.claudeInputTokens,
          claudeOutputTokens: l.claudeOutputTokens,
          claudeCacheCreationTokens: l.claudeCacheCreationTokens,
          claudeCacheReadTokens: l.claudeCacheReadTokens,
          costEur: Math.round(l.eurEstimate * 10000) / 10000,
        },
        metadata: { batchId: b.batchId, status: "fertig", quelle: b.label, einheiten: b.units },
      });
    },
    /** Je judge()-Aufruf; die Trace-ID gehört in EvaluateResult.langfuseTraceId. */
    pruefen(evals: QuestionEval[], label: string): Promise<string | null> {
      const kontext: TraceKontext = {
        ...o.common,
        schritt: "pruefen",
        modell: o.judgeModel,
        promptVersion: o.judgePrompt ? `v${o.judgePrompt.version}` : o.judgePromptVersion,
      };
      return schreibe({
        name: traceTitel(kontext),
        courseId: o.courseId,
        kontext,
        prompt: o.judgePrompt ?? undefined,
        passed: evals.every((e) => e.passed),
        scores: {
          safetyFlag: aggregateScores(evals).safetyFlag,
          ...(evals.length > 0
            ? { Bestehensquote: Math.round((evals.filter((e) => e.passed).length / evals.length) * 100) / 100 }
            : {}),
        },
        extraScores: pruefpunktScores(evals),
        metadata: { quelle: label, fragen: evals.length },
      });
    },
  };
}
