/**
 * AP-15 budget guard — AGENTS.md: stop at €20 API cost per course run.
 * Prices from D-06 / D-07 (Batch 50 % on Claude). Track estimates in USD; €20 ≈ $21.60.
 */

export const BUDGET_EUR = 20;
/** Conservative EUR→USD for guard (slightly under 1.1). */
export const BUDGET_USD = 21.5;

/** claude-sonnet-5-5 Batch: half of $2 / $10 per 1M → $1 / $5 */
export const CLAUDE_BATCH_IN_PER_MTOK = 1.0;
export const CLAUDE_BATCH_OUT_PER_MTOK = 5.0;
/** Prompt caching multipliers on the base input price (cache write 1.25×, cache read 0.1×). */
export const CLAUDE_CACHE_WRITE_FACTOR = 1.25;
export const CLAUDE_CACHE_READ_FACTOR = 0.1;
/**
 * Batch-Preise je 1M Token (USD) laut offizieller Preisseite, geprüft 2026-10-05 (D-41).
 * Cache-Schreiben (5 min) = 1,25×, Cache-Lesen = 0,1× des Batch-Eingabepreises (Multiplikatoren stapeln mit Batch).
 */
export const CLAUDE_BATCH_PRICES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5-5": { in: 1.0, out: 5.0 },
  "claude-haiku-4-5-20251001": { in: 0.5, out: 2.5 },
};

/** Kosten in USD für gemessene Claude-Usage eines Modells zu Batch-Preisen. */
export function claudeBatchUsd(
  model: string,
  c: {
    claudeInputTokens: number;
    claudeOutputTokens: number;
    claudeCacheCreationTokens: number;
    claudeCacheReadTokens: number;
  },
): number {
  const p = CLAUDE_BATCH_PRICES[model];
  if (!p) throw new Error(`Kein Batch-Preis für Modell ${model}`);
  const usd =
    (c.claudeInputTokens / 1e6) * p.in +
    (c.claudeOutputTokens / 1e6) * p.out +
    (c.claudeCacheCreationTokens / 1e6) * p.in * CLAUDE_CACHE_WRITE_FACTOR +
    (c.claudeCacheReadTokens / 1e6) * p.in * CLAUDE_CACHE_READ_FACTOR;
  return Math.round(usd * 10000) / 10000;
}

/** gpt-5.4-mini: $0.75 / $4.50 per 1M */
export const GPT_JUDGE_IN_PER_MTOK = 0.75;
export const GPT_JUDGE_OUT_PER_MTOK = 4.5;

export type CostLedger = {
  claudeInputTokens: number;
  claudeOutputTokens: number;
  /** usage.cache_creation_input_tokens */
  claudeCacheCreationTokens: number;
  /** usage.cache_read_input_tokens */
  claudeCacheReadTokens: number;
  openaiInputTokens: number;
  openaiOutputTokens: number;
  usdEstimate: number;
  eurEstimate: number;
  stopped: boolean;
  stopReason?: string;
};

const EUR_PER_USD = 20 / 21.5;

export function emptyLedger(): CostLedger {
  return {
    claudeInputTokens: 0,
    claudeOutputTokens: 0,
    claudeCacheCreationTokens: 0,
    claudeCacheReadTokens: 0,
    openaiInputTokens: 0,
    openaiOutputTokens: 0,
    usdEstimate: 0,
    eurEstimate: 0,
    stopped: false,
  };
}

type LedgerCounts = Omit<CostLedger, "usdEstimate" | "eurEstimate" | "stopped" | "stopReason">;

export function estimateUsd(
  ledger: Omit<LedgerCounts, "claudeCacheCreationTokens" | "claudeCacheReadTokens"> &
    Partial<Pick<LedgerCounts, "claudeCacheCreationTokens" | "claudeCacheReadTokens">>,
): number {
  const claude =
    (ledger.claudeInputTokens / 1e6) * CLAUDE_BATCH_IN_PER_MTOK +
    (ledger.claudeOutputTokens / 1e6) * CLAUDE_BATCH_OUT_PER_MTOK +
    ((ledger.claudeCacheCreationTokens ?? 0) / 1e6) *
      CLAUDE_BATCH_IN_PER_MTOK *
      CLAUDE_CACHE_WRITE_FACTOR +
    ((ledger.claudeCacheReadTokens ?? 0) / 1e6) *
      CLAUDE_BATCH_IN_PER_MTOK *
      CLAUDE_CACHE_READ_FACTOR;
  const openai =
    (ledger.openaiInputTokens / 1e6) * GPT_JUDGE_IN_PER_MTOK +
    (ledger.openaiOutputTokens / 1e6) * GPT_JUDGE_OUT_PER_MTOK;
  return Math.round((claude + openai) * 10000) / 10000;
}

export function refreshLedger(ledger: CostLedger): CostLedger {
  const usdEstimate = estimateUsd(ledger);
  const eurEstimate = Math.round(usdEstimate * EUR_PER_USD * 100) / 100;
  const stopped = usdEstimate >= BUDGET_USD || eurEstimate >= BUDGET_EUR;
  return {
    ...ledger,
    usdEstimate,
    eurEstimate,
    stopped,
    stopReason: stopped
      ? `Budget guard: ~€${eurEstimate} / $${usdEstimate} ≥ €${BUDGET_EUR}`
      : ledger.stopReason,
  };
}

export function addClaudeUsage(
  ledger: CostLedger,
  inputTokens: number,
  outputTokens: number,
): CostLedger {
  return refreshLedger({
    ...ledger,
    claudeInputTokens: ledger.claudeInputTokens + Math.max(0, inputTokens),
    claudeOutputTokens: ledger.claudeOutputTokens + Math.max(0, outputTokens),
  });
}

/** Anthropic `usage` object of a Messages / Batch result. */
export type ClaudeUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

const tok = (n: number | null | undefined) =>
  Number.isFinite(n) ? Math.max(0, n as number) : 0;

/** Add measured usage (incl. cache tokens) from one Messages/Batch result. */
export function addClaudeMeasuredUsage(
  ledger: CostLedger,
  usage: ClaudeUsage,
): CostLedger {
  return refreshLedger({
    ...ledger,
    claudeInputTokens: ledger.claudeInputTokens + tok(usage.input_tokens),
    claudeOutputTokens: ledger.claudeOutputTokens + tok(usage.output_tokens),
    claudeCacheCreationTokens:
      (ledger.claudeCacheCreationTokens ?? 0) + tok(usage.cache_creation_input_tokens),
    claudeCacheReadTokens:
      (ledger.claudeCacheReadTokens ?? 0) + tok(usage.cache_read_input_tokens),
  });
}

/** Merge the Claude part of another ledger (e.g. from collectBatchUnits). */
export function addClaudeLedger(ledger: CostLedger, other: CostLedger): CostLedger {
  return addClaudeMeasuredUsage(ledger, {
    input_tokens: other.claudeInputTokens,
    output_tokens: other.claudeOutputTokens,
    cache_creation_input_tokens: other.claudeCacheCreationTokens,
    cache_read_input_tokens: other.claudeCacheReadTokens,
  });
}

export function addOpenAIUsage(
  ledger: CostLedger,
  inputTokens: number,
  outputTokens: number,
): CostLedger {
  return refreshLedger({
    ...ledger,
    openaiInputTokens: ledger.openaiInputTokens + Math.max(0, inputTokens),
    openaiOutputTokens: ledger.openaiOutputTokens + Math.max(0, outputTokens),
  });
}

/** Rough preflight for Phase A (280 units × ~6 questions) — must stay under budget. */
export function phaseAPreflightUsd(units = 280, questionsPerUnit = 6): number {
  const genIn = units * 3000;
  const genOut = units * 2500;
  const judgeIn = units * questionsPerUnit * 1200;
  const judgeOut = units * questionsPerUnit * 200;
  const regenFactor = 1.2;
  return estimateUsd({
    claudeInputTokens: Math.round(genIn * regenFactor),
    claudeOutputTokens: Math.round(genOut * regenFactor),
    openaiInputTokens: Math.round(judgeIn * regenFactor),
    openaiOutputTokens: Math.round(judgeOut * regenFactor),
  });
}
