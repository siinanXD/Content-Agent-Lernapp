/**
 * SIN-258 — Kosten-Ledger je Pipeline-Lauf.
 * Schreibt Token und Euro eines Laufs in Supabase (`pipeline_run_costs`) und als Trace an
 * Langfuse Cloud EU. Ohne Live-Keys: Mock im Speicher bzw. kein Trace. Nur Kennungen und
 * Zahlen, keine Prompts und keine Personendaten.
 */
import { getStorage } from "@/lib/storage";
import { getServiceSupabase } from "@/lib/storage/supabase-client";
import { BUDGET_EUR, refreshLedger, type CostLedger } from "./cost-guard";
import { recordRunCostTrace } from "./langfuse-client";

export type RunCostRecord = {
  id: string;
  runId: string;
  courseId: string;
  kind: string;
  claudeInputTokens: number;
  claudeOutputTokens: number;
  claudeCacheCreationTokens: number;
  claudeCacheReadTokens: number;
  openaiInputTokens: number;
  openaiOutputTokens: number;
  costUsd: number;
  costEur: number;
  capEur: number;
  stopped: boolean;
  stopReason?: string;
  langfuseTraceId?: string;
  createdAt: string;
};

/** Der Lauf hat den Deckel je Kurslauf erreicht und wird gestoppt. */
export class RunBudgetExceededError extends Error {
  constructor(
    public readonly spentEur: number,
    public readonly capEur: number,
  ) {
    super(`Kostendeckel: €${spentEur} ≥ €${capEur} je Kurslauf`);
    this.name = "RunBudgetExceededError";
  }
}

/** Wirft, sobald die bisherigen Kosten des Laufs den Deckel erreichen (vor jedem bezahlten Schritt aufrufen). */
export function assertWithinRunCap(spentEur: number, capEur = BUDGET_EUR): void {
  if (spentEur >= capEur) throw new RunBudgetExceededError(spentEur, capEur);
}

/**
 * Ledger → Datensatz. `totalEur` überschreibt die Euro-Summe, wenn Kosten außerhalb des
 * Ledgers anfallen (z. B. die Reparaturstufe als eigener Prozess).
 */
export function toRunCostRecord(
  input: { runId: string; courseId: string; kind: string; ledger: CostLedger; totalEur?: number; capEur?: number },
  now = new Date().toISOString(),
): RunCostRecord {
  const l = refreshLedger(input.ledger);
  const capEur = input.capEur ?? BUDGET_EUR;
  const costEur = Math.round((input.totalEur ?? l.eurEstimate) * 100) / 100;
  const stopped = l.stopped || costEur >= capEur;
  return {
    id: crypto.randomUUID(),
    runId: input.runId,
    courseId: input.courseId,
    kind: input.kind,
    claudeInputTokens: l.claudeInputTokens,
    claudeOutputTokens: l.claudeOutputTokens,
    claudeCacheCreationTokens: l.claudeCacheCreationTokens,
    claudeCacheReadTokens: l.claudeCacheReadTokens,
    openaiInputTokens: l.openaiInputTokens,
    openaiOutputTokens: l.openaiOutputTokens,
    costUsd: l.usdEstimate,
    costEur,
    capEur,
    stopped,
    stopReason: stopped ? (l.stopReason ?? `Kostendeckel: €${costEur} ≥ €${capEur}`) : undefined,
    createdAt: now,
  };
}

const mockRows: RunCostRecord[] = [];

export function clearMockRunCosts(): void {
  mockRows.length = 0;
}

/** Hängt einen Datensatz an das Ledger an (Supabase live, sonst Speicher). */
export async function appendRunCost(record: RunCostRecord): Promise<void> {
  if (getStorage().backend !== "supabase") {
    mockRows.push(record);
    return;
  }
  const { error } = await getServiceSupabase().from("pipeline_run_costs").insert({
    id: record.id,
    run_id: record.runId,
    course_id: record.courseId,
    kind: record.kind,
    claude_input_tokens: record.claudeInputTokens,
    claude_output_tokens: record.claudeOutputTokens,
    claude_cache_creation_tokens: record.claudeCacheCreationTokens,
    claude_cache_read_tokens: record.claudeCacheReadTokens,
    openai_input_tokens: record.openaiInputTokens,
    openai_output_tokens: record.openaiOutputTokens,
    cost_usd: record.costUsd,
    cost_eur: record.costEur,
    cap_eur: record.capEur,
    stopped: record.stopped,
    stop_reason: record.stopReason ?? null,
    langfuse_trace_id: record.langfuseTraceId ?? null,
    created_at: record.createdAt,
  });
  if (error) throw new Error(`pipeline_run_costs_insert: ${error.message}`);
}

export async function listRunCosts(): Promise<RunCostRecord[]> {
  if (getStorage().backend !== "supabase") return [...mockRows];
  const { data, error } = await getServiceSupabase()
    .from("pipeline_run_costs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`pipeline_run_costs_list: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    runId: r.run_id,
    courseId: r.course_id,
    kind: r.kind,
    claudeInputTokens: Number(r.claude_input_tokens),
    claudeOutputTokens: Number(r.claude_output_tokens),
    claudeCacheCreationTokens: Number(r.claude_cache_creation_tokens),
    claudeCacheReadTokens: Number(r.claude_cache_read_tokens),
    openaiInputTokens: Number(r.openai_input_tokens),
    openaiOutputTokens: Number(r.openai_output_tokens),
    costUsd: Number(r.cost_usd),
    costEur: Number(r.cost_eur),
    capEur: Number(r.cap_eur),
    stopped: r.stopped,
    stopReason: r.stop_reason ?? undefined,
    langfuseTraceId: r.langfuse_trace_id ?? undefined,
    createdAt: r.created_at,
  }));
}

/** Lauf-Ende: Trace an Langfuse (best effort, ohne Keys null), dann Ledger-Zeile. */
export async function recordRunCost(
  input: Parameters<typeof toRunCostRecord>[0],
): Promise<RunCostRecord> {
  const record = toRunCostRecord(input);
  const traceId = await recordRunCostTrace({ name: `pipeline-run-${record.kind}`, record });
  if (traceId) record.langfuseTraceId = traceId;
  await appendRunCost(record);
  return record;
}
