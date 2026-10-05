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

/**
 * Claude Batch prices per 1M tokens in USD (D-37, platform.claude.com/docs/en/about-claude/pricing).
 * Batch = 50 % of list. Cache multipliers stack on the batch input price:
 * 1h write 2x, read 0.1x (5m write would be 1.25x). Output has no cache price.
 */
export type ClaudePrice = {
  input: number;
  output: number;
  cacheWrite1h: number;
  cacheRead: number;
};

export const CLAUDE_BATCH_PRICES: Record<string, ClaudePrice> = {
  "claude-sonnet-5-5": { input: 1.0, output: 5.0, cacheWrite1h: 2.0, cacheRead: 0.1 },
  "claude-haiku-4-5": { input: 0.5, output: 2.5, cacheWrite1h: 1.0, cacheRead: 0.05 },
};
export const DEFAULT_PRICE_MODEL = "claude-sonnet-5-5";

export function claudeBatchPrice(model: string = DEFAULT_PRICE_MODEL): ClaudePrice {
  const price = CLAUDE_BATCH_PRICES[model];
  if (!price) throw new Error(`No Claude batch price for model "${model}"`);
  return price;
}

export type ClaudeUsage = {
  inputTokens: number;
  outputTokens: number;
  /** Tokens written to the prompt cache (usage.cache_creation_input_tokens). */
  cacheWriteTokens?: number;
  /** Tokens read from the prompt cache (usage.cache_read_input_tokens). */
  cacheReadTokens?: number;
};

/** USD for one Claude batch usage record. input_tokens excludes cache tokens (Anthropic usage). */
export function claudeUsageUsd(usage: ClaudeUsage, model: string = DEFAULT_PRICE_MODEL): number {
  const p = claudeBatchPrice(model);
  return (
    (Math.max(0, usage.inputTokens) / 1e6) * p.input +
    (Math.max(0, usage.outputTokens) / 1e6) * p.output +
    (Math.max(0, usage.cacheWriteTokens ?? 0) / 1e6) * p.cacheWrite1h +
    (Math.max(0, usage.cacheReadTokens ?? 0) / 1e6) * p.cacheRead
  );
}
/** gpt-5.4-mini: $0.75 / $4.50 per 1M */
export const GPT_JUDGE_IN_PER_MTOK = 0.75;
export const GPT_JUDGE_OUT_PER_MTOK = 4.5;

export type CostLedger = {
  claudeInputTokens: number;
  claudeOutputTokens: number;
  claudeCacheWriteTokens?: number;
  claudeCacheReadTokens?: number;
  /** Accumulated Claude USD priced per model; absent on legacy ledgers (token fields priced as Sonnet). */
  claudeUsd?: number;
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
    openaiInputTokens: 0,
    openaiOutputTokens: 0,
    usdEstimate: 0,
    eurEstimate: 0,
    stopped: false,
  };
}

export function estimateUsd(ledger: Omit<CostLedger, "usdEstimate" | "eurEstimate" | "stopped" | "stopReason">): number {
  const claude =
    ledger.claudeUsd ??
    (ledger.claudeInputTokens / 1e6) * CLAUDE_BATCH_IN_PER_MTOK +
      (ledger.claudeOutputTokens / 1e6) * CLAUDE_BATCH_OUT_PER_MTOK;
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
  opts?: { model?: string; cacheWriteTokens?: number; cacheReadTokens?: number },
): CostLedger {
  const cacheWriteTokens = Math.max(0, opts?.cacheWriteTokens ?? 0);
  const cacheReadTokens = Math.max(0, opts?.cacheReadTokens ?? 0);
  const callUsd = claudeUsageUsd(
    { inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens },
    opts?.model,
  );
  // Legacy ledgers carry no claudeUsd: seed it from their token totals (Sonnet price).
  const priorUsd =
    ledger.claudeUsd ??
    claudeUsageUsd({
      inputTokens: ledger.claudeInputTokens,
      outputTokens: ledger.claudeOutputTokens,
    });
  return refreshLedger({
    ...ledger,
    claudeInputTokens: ledger.claudeInputTokens + Math.max(0, inputTokens),
    claudeOutputTokens: ledger.claudeOutputTokens + Math.max(0, outputTokens),
    claudeCacheWriteTokens: (ledger.claudeCacheWriteTokens ?? 0) + cacheWriteTokens,
    claudeCacheReadTokens: (ledger.claudeCacheReadTokens ?? 0) + cacheReadTokens,
    claudeUsd: priorUsd + callUsd,
  });
}

/** Add another run's Claude usage (tokens, cache tokens, per-model USD) to a ledger. */
export function mergeClaudeLedger(ledger: CostLedger, other: CostLedger): CostLedger {
  const usd = (l: CostLedger) =>
    l.claudeUsd ??
    claudeUsageUsd({ inputTokens: l.claudeInputTokens, outputTokens: l.claudeOutputTokens });
  return refreshLedger({
    ...ledger,
    claudeInputTokens: ledger.claudeInputTokens + other.claudeInputTokens,
    claudeOutputTokens: ledger.claudeOutputTokens + other.claudeOutputTokens,
    claudeCacheWriteTokens:
      (ledger.claudeCacheWriteTokens ?? 0) + (other.claudeCacheWriteTokens ?? 0),
    claudeCacheReadTokens:
      (ledger.claudeCacheReadTokens ?? 0) + (other.claudeCacheReadTokens ?? 0),
    claudeUsd: usd(ledger) + usd(other),
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
