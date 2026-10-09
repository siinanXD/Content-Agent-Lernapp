/**
 * SIN-448: Modellvergleiche (`ab-haiku-sonnet`, `ab-alle-modelle`) schreiben je Modell und Einheit einen
 * Langfuse-Trace im Format der Fabrik (SIN-383): Erzeugen mit Modell, Tokens und Kosten, jede Frage mit
 * Bewertung, Ergebnis. Session je Vergleichslauf, Tag `lauf:Modellvergleich`. Tracing bricht den Lauf nie ab.
 * Der Schreiber ist austauschbar, damit Tests ohne Netz laufen.
 */
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { recordUnitTrace } from "./langfuse-client";
import type { QuestionEval } from "./schemas";
import type { ErzeugenInfo } from "./unit-traces";

export const vergleichSessionId = (runId: string) => `vergleich-${runId}`.slice(0, 200);

export type VergleichUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  /** Kosten der Erzeugung dieses Modells (ohne Richter), in Euro. */
  costEur: number;
};

export type VergleichTraceOpts = {
  runId: string;
  modell: string;
  modul: string;
  beruf?: string;
  units: GeneratedUnit[];
  evals: QuestionEval[];
  usage: VergleichUsage;
  richterModell: string;
  minBestanden: number;
  write?: typeof recordUnitTrace;
};

/** Verteilt Tokens und Kosten gleichmäßig auf die Einheiten (die API liefert nur Summen je Anfrage). */
export function vergleichErzeugen(modell: string, usage: VergleichUsage, units: number): ErzeugenInfo {
  const n = Math.max(1, units);
  return {
    modell,
    inputTokens: Math.round(usage.inputTokens / n),
    outputTokens: Math.round(usage.outputTokens / n),
    ...(usage.cacheCreationTokens ? { cacheCreationTokens: Math.round(usage.cacheCreationTokens / n) } : {}),
    ...(usage.cacheReadTokens ? { cacheReadTokens: Math.round(usage.cacheReadTokens / n) } : {}),
    costEur: Math.round((usage.costEur / n) * 10000) / 10000,
  };
}

/** Schreibt die Traces eines Modells; liefert die Zahl der geschriebenen Traces. Wirft nie. */
export async function traceVergleich(o: VergleichTraceOpts): Promise<number> {
  const write = o.write ?? recordUnitTrace;
  const erzeugen = vergleichErzeugen(o.modell, o.usage, o.units.length);
  let geschrieben = 0;
  for (const einheit of o.units) {
    const evals = o.evals.filter((e) => e.unitId === einheit.id);
    if (!evals.length) continue;
    const id = await write({
      courseId: `vergleich-${o.runId}`,
      sessionId: vergleichSessionId(o.runId),
      kontext: { beruf: o.beruf, modul: o.modul, schritt: "pruefen", laufArt: "vergleich", modell: o.modell },
      einheit,
      evals,
      erzeugen,
      minBestanden: o.minBestanden,
      richterModell: o.richterModell,
    }).catch(() => null);
    if (id) geschrieben += 1;
  }
  return geschrieben;
}
