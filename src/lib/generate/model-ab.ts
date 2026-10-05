/**
 * AP-22: Haiku 4.5 vs. Sonnet 5.5 A/B — planning, cost preflight and report (D-37).
 * Pure logic only; scripts/ap22-model-ab.ts does the live Batch + judge calls.
 * Nothing here publishes content.
 */

import { loadMafCurriculum, type Curriculum } from "@/lib/content/curriculum";
import {
  DEFAULT_GENERATOR_MODEL,
  HAIKU_GENERATOR_MODEL,
} from "@/lib/anthropic/client";
import { GOLDSET_TARGET } from "@/lib/quality/goldset-target";
import {
  claudeUsageUsd,
  estimateUsd,
  type CostLedger,
} from "@/lib/quality/cost-guard";
import {
  aggregateScores,
  QUALITY_THRESHOLDS,
  scoresPass,
  type QualityScores,
  type QuestionEval,
} from "@/lib/quality/schemas";
import type { EvalItem } from "@/lib/quality/evaluate-agent";
import { UNITS_PER_CHUNK, type BatchChunkTarget } from "./batch-generate";
import type { GeneratedUnit } from "./maf-lernfeld-seed";

export const AB_MODULE_ID = "LF3";
export const AB_UNIT_COUNT = 20;
/** AP-22 hard cap for the whole A/B run (generator x2 + judge). */
export const AB_BUDGET_EUR = 3;
const EUR_PER_USD = 20 / 21.5;
export const AB_MODELS = [DEFAULT_GENERATOR_MODEL, HAIKU_GENERATOR_MODEL] as const;

/** First `unitCount` units of the module in block order, chunked like Phase A batches. */
export function abChunkTargets(
  c: Curriculum = loadMafCurriculum(),
  moduleId = AB_MODULE_ID,
  unitCount = AB_UNIT_COUNT,
): BatchChunkTarget[] {
  const mod = c.modules.find((m) => m.id === moduleId);
  if (!mod) throw new Error(`Module ${moduleId} not in curriculum`);
  const targets: BatchChunkTarget[] = [];
  let left = unitCount;
  for (const block of mod.blocks) {
    for (let offset = 0; offset < block.units && left > 0; offset += UNITS_PER_CHUNK) {
      const n = Math.min(UNITS_PER_CHUNK, block.units - offset, left);
      targets.push({
        customId: `ab-${block.id}-u${offset}-${offset + n - 1}`,
        module: mod,
        block,
        unitOffset: offset,
        unitCount: n,
      });
      left -= n;
    }
    if (left <= 0) break;
  }
  if (left > 0) throw new Error(`Module ${moduleId} has fewer than ${unitCount} units`);
  return targets;
}

/** Rough preflight (same token assumptions as phaseAPreflightUsd; cached prefix read after first write). */
export function abPreflightUsd(
  model: string,
  units = AB_UNIT_COUNT,
  opts?: { cachedPrefixTokens?: number; requests?: number },
): number {
  const requests = opts?.requests ?? Math.ceil(units / UNITS_PER_CHUNK);
  const prefix = opts?.cachedPrefixTokens ?? 3000;
  const perRequestIn = 1500; // variable part (block, sources, range)
  return claudeUsageUsd(
    {
      inputTokens: requests * perRequestIn,
      outputTokens: units * 2500,
      cacheWriteTokens: prefix,
      cacheReadTokens: Math.max(0, requests - 1) * prefix,
    },
    model,
  );
}

export type AbPlan = {
  models: string[];
  unitTarget: number;
  chunkCount: number;
  customIds: string[];
  preflightUsd: Record<string, number>;
  judgeUsd: number;
  totalEur: number;
  budgetEur: number;
  withinBudget: boolean;
};

const QUESTIONS_PER_UNIT = 6;

export function planModelAb(
  models: readonly string[] = AB_MODELS,
  c: Curriculum = loadMafCurriculum(),
): AbPlan {
  const targets = abChunkTargets(c);
  const unitTarget = targets.reduce((s, t) => s + t.unitCount, 0);
  const preflightUsd: Record<string, number> = {};
  for (const m of models) {
    preflightUsd[m] = abPreflightUsd(m, unitTarget, { requests: targets.length });
  }
  const judgeUsd = estimateUsd({
    claudeInputTokens: 0,
    claudeOutputTokens: 0,
    claudeUsd: 0,
    openaiInputTokens: models.length * unitTarget * QUESTIONS_PER_UNIT * 1200,
    openaiOutputTokens: models.length * unitTarget * QUESTIONS_PER_UNIT * 200,
  });
  const totalUsd = Object.values(preflightUsd).reduce((s, v) => s + v, 0) + judgeUsd;
  const totalEur = Math.round(totalUsd * EUR_PER_USD * 100) / 100;
  return {
    models: [...models],
    unitTarget,
    chunkCount: targets.length,
    customIds: targets.map((t) => t.customId),
    preflightUsd,
    judgeUsd,
    totalEur,
    withinBudget: totalEur < AB_BUDGET_EUR,
    budgetEur: AB_BUDGET_EUR,
  };
}

/** True once the combined run ledger reaches the AP-22 cap (€3). */
export function abBudgetExceeded(...ledgers: CostLedger[]): boolean {
  const usd = ledgers.reduce((s, l) => s + l.usdEstimate, 0);
  return usd * EUR_PER_USD >= AB_BUDGET_EUR;
}

export function unitsToEvalItems(
  units: GeneratedUnit[],
  c: Curriculum = loadMafCurriculum(),
): EvalItem[] {
  return units.flatMap((u) => {
    const mod = c.modules.find((m) => m.id === u.moduleId);
    return u.questions.map((q) => ({
      id: `${u.id}-${q.id}`,
      unitId: u.id,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
      moduleId: u.moduleId,
      blockId: u.blockId,
      year: mod?.year,
      niveauHint: u.niveau ?? mod?.niveau,
      safety: u.safetyFlag ?? mod?.safety,
    }));
  });
}

export type AbModelResult = {
  model: string;
  unitsGenerated: number;
  failedCustomIds: string[];
  questionCount: number;
  scores: QualityScores;
  passesGate: boolean;
  /** Score minus Goldset target (niveau/language); fidelity/uniqueness as 1/0 deltas. */
  deltaToTarget: { sourceFidelity: number; uniqueness: number; niveau: number; language: number };
  costUsd: number;
  usdPerUnit: number;
};

export function summarizeModel(opts: {
  model: string;
  units: GeneratedUnit[];
  failedCustomIds: string[];
  evals: QuestionEval[];
  costUsd: number;
}): AbModelResult {
  const scores = aggregateScores(opts.evals);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    model: opts.model,
    unitsGenerated: opts.units.length,
    failedCustomIds: opts.failedCustomIds,
    questionCount: opts.evals.length,
    scores,
    passesGate: opts.evals.length > 0 && scoresPass(scores),
    deltaToTarget: {
      sourceFidelity: scores.sourceFidelity - GOLDSET_TARGET.sourceFidelity,
      uniqueness: scores.uniqueness - GOLDSET_TARGET.uniqueness,
      niveau: round(scores.niveau - GOLDSET_TARGET.niveau),
      language: round(scores.language - GOLDSET_TARGET.language),
    },
    costUsd: round(opts.costUsd),
    usdPerUnit: opts.units.length ? round(opts.costUsd / opts.units.length) : 0,
  };
}

/** Haiku may replace Sonnet only if it passes the gate (D-06) — a recommendation, never automatic. */
export function recommendModel(results: AbModelResult[]): string {
  const sonnet = results.find((r) => r.model === DEFAULT_GENERATOR_MODEL);
  const haiku = results.find((r) => r.model === HAIKU_GENERATOR_MODEL);
  if (!haiku || haiku.unitsGenerated === 0) return DEFAULT_GENERATOR_MODEL;
  if (!haiku.passesGate) return DEFAULT_GENERATOR_MODEL;
  if (sonnet && haiku.scores.niveau < sonnet.scores.niveau - 0.3) return DEFAULT_GENERATOR_MODEL;
  return HAIKU_GENERATOR_MODEL;
}

export function renderReport(opts: {
  runId: string;
  dryRun: boolean;
  plan: AbPlan;
  results: AbModelResult[];
  cacheTokens?: Record<string, { write: number; read: number }>;
  totalEur?: number;
}): string {
  const t = GOLDSET_TARGET;
  const lines: string[] = [
    `# AP-22 Modell-A/B: Haiku 4.5 vs. Sonnet 5.5 (${opts.dryRun ? "Trockenlauf" : "Live"})`,
    "",
    `Lauf: \`${opts.runId}\` · Modul ${AB_MODULE_ID} (MAF Metall) · ${opts.plan.unitTarget} Einheiten je Modell · ${opts.plan.chunkCount} Batch-Requests je Modell.`,
    `Richter: \`gpt-5.4-mini\` · Goldset-Ziel: fidelity ${t.sourceFidelity}, uniqueness ${t.uniqueness}, niveau ${t.niveau}, language ${t.language} · Gate: niveau ≥ ${QUALITY_THRESHOLDS.niveauMin}, language ≥ ${QUALITY_THRESHOLDS.languageMin}.`,
    `Deckel: €${opts.plan.budgetEur} · Vorab-Schätzung: €${opts.plan.totalEur}${opts.totalEur !== undefined ? ` · Ist: €${opts.totalEur}` : ""}.`,
    "Nichts veröffentlicht, nichts in Supabase gespeichert.",
    "",
  ];
  if (opts.dryRun) {
    lines.push(
      "Trockenlauf: keine API-Aufrufe. Schätzung je Modell (Batch, mit Prompt-Cache):",
      "",
      "| Modell | Schätzung USD |",
      "| --- | --- |",
      ...opts.plan.models.map((m) => `| ${m} | ${opts.plan.preflightUsd[m]?.toFixed(4)} |`),
      "",
      `Richter (beide Modelle): ~$${opts.plan.judgeUsd.toFixed(4)}.`,
    );
    return lines.join("\n") + "\n";
  }
  lines.push(
    "| Modell | Einheiten | Fragen | fidelity | uniqueness | niveau | language | Gate | USD | USD/Einheit |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...opts.results.map(
      (r) =>
        `| ${r.model} | ${r.unitsGenerated} | ${r.questionCount} | ${r.scores.sourceFidelity} | ${r.scores.uniqueness} | ${r.scores.niveau} | ${r.scores.language} | ${r.passesGate ? "ja" : "nein"} | ${r.costUsd} | ${r.usdPerUnit} |`,
    ),
    "",
    "Delta zum Goldset-Ziel (Score − Ziel):",
    "",
    ...opts.results.map(
      (r) =>
        `- ${r.model}: fidelity ${r.deltaToTarget.sourceFidelity}, uniqueness ${r.deltaToTarget.uniqueness}, niveau ${r.deltaToTarget.niveau}, language ${r.deltaToTarget.language}`,
    ),
    "",
  );
  if (opts.cacheTokens) {
    lines.push(
      "Prompt-Cache (Tokens):",
      "",
      ...Object.entries(opts.cacheTokens).map(
        ([m, v]) => `- ${m}: geschrieben ${v.write}, gelesen ${v.read}`,
      ),
      "",
    );
  }
  lines.push(`Empfehlung: **${recommendModel(opts.results)}** (Haiku nur, wenn die Schwelle hält, D-06). Entscheidung trifft ein Mensch.`);
  return lines.join("\n") + "\n";
}
