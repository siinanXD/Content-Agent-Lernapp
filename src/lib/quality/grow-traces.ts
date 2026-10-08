/**
 * SIN-383 — Traces der Content-Fabrik: ein Trace je Einheit (löst die Batch-Traces aus SIN-380 ab).
 * Der Batch liefert nur Summen; Tokens und Kosten werden gleichmäßig auf die gelieferten Einheiten verteilt.
 * Der Schreiber ist austauschbar, damit Tests Anzahl und Verschachtelung prüfen können.
 */
import type { CostLedger } from "./cost-guard";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { flushLangfuseOtel } from "./langfuse-otel";
import { recordUnitTrace } from "./langfuse-client";
import { kurslaufSessionId, type LaufArt, type TraceKontext } from "./langfuse-names";
import type { ErzeugenInfo } from "./unit-traces";
import type { QuestionEval } from "./schemas";

type Schreiber = typeof recordUnitTrace;
type PromptLink = { name: string; version: number } | null | undefined;

export type GrowTracerOptions = {
  runId: string;
  courseId: string;
  common: Omit<TraceKontext, "schritt">;
  generatorModel: string;
  judgeModel: string;
  generatorPrompt?: PromptLink;
  minBestanden: number;
  write?: Schreiber;
  flush?: () => Promise<void>;
};

export function createGrowTracer(o: GrowTracerOptions) {
  const write = o.write ?? recordUnitTrace;
  const flush = o.flush ?? flushLangfuseOtel;
  const sessionId = kurslaufSessionId(o.runId);
  const erzeugt = new Map<string, { info: ErzeugenInfo; laufArt: LaufArt }>();

  return {
    /** Nach pollBatchUntilDone: merkt Usage und Kosten je Einheit für den späteren Trace. */
    batchFertig(units: GeneratedUnit[], ledger: CostLedger, laufArt: LaufArt): void {
      const n = Math.max(1, units.length);
      const info: ErzeugenInfo = {
        modell: o.generatorModel,
        inputTokens: Math.round(ledger.claudeInputTokens / n),
        outputTokens: Math.round(ledger.claudeOutputTokens / n),
        cacheCreationTokens: Math.round(ledger.claudeCacheCreationTokens / n),
        cacheReadTokens: Math.round(ledger.claudeCacheReadTokens / n),
        costEur: Math.round((ledger.eurEstimate / n) * 10000) / 10000,
        prompt: o.generatorPrompt,
      };
      for (const u of units) erzeugt.set(u.id, { info, laufArt });
    },
    /** Nach dem Richter: ein Trace je Einheit. Liefert Einheit → Trace-ID für question_evaluations. */
    async einheiten(units: GeneratedUnit[], evals: QuestionEval[]): Promise<Map<string, string>> {
      const ids = new Map<string, string>();
      for (const unit of units) {
        const mine = evals.filter((e) => e.unitId === unit.id);
        const gen = erzeugt.get(unit.id);
        if (mine.length === 0 || !gen) continue;
        const id = await write({
          courseId: o.courseId,
          sessionId,
          kontext: { ...o.common, schritt: "pruefen", laufArt: gen.laufArt },
          einheit: unit,
          evals: mine,
          erzeugen: gen.info,
          minBestanden: o.minBestanden,
          richterModell: o.judgeModel,
        }).catch(() => null);
        if (id) ids.set(unit.id, id);
      }
      // Nach jedem Schritt senden, damit Traces auch bei Abbruch ankommen.
      await flush().catch(() => undefined);
      return ids;
    },
  };
}
