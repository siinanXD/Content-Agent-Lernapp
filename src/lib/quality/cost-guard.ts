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
/** gpt-5.4-mini: $0.75 / $4.50 per 1M */
export const GPT_JUDGE_IN_PER_MTOK = 0.75;
export const GPT_JUDGE_OUT_PER_MTOK = 4.5;

export type CostLedger = {
  claudeInputTokens: number;
  claudeOutputTokens: number;
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
): CostLedger {
  return refreshLedger({
    ...ledger,
    claudeInputTokens: ledger.claudeInputTokens + Math.max(0, inputTokens),
    claudeOutputTokens: ledger.claudeOutputTokens + Math.max(0, outputTokens),
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
