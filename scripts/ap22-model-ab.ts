/**
 * AP-22 / SIN-219 — Haiku 4.5 vs. Sonnet 5.5 on 20 MAF Metall LF3 units.
 *
 * Per model: one Message Batch (cached Didaktik + Curriculum-Map prefix), judged by gpt-5.4-mini,
 * compared against the Goldset target; report under docs/ops/. Cap €3. Publishes nothing,
 * touches no database.
 *
 * Usage:
 *   npm run ap22:model-ab -- --dry-run   # no API calls, writes the plan report
 *   npm run ap22:model-ab                # live (needs ANTHROPIC_API_KEY + OPENAI_API_KEY)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectBatchUnits,
  pollBatchUntilDone,
  submitChunkTargets,
} from "../src/lib/generate/batch-generate";
import {
  AB_MODELS,
  abBudgetExceeded,
  abChunkTargets,
  planModelAb,
  renderReport,
  summarizeModel,
  unitsToEvalItems,
  type AbModelResult,
} from "../src/lib/generate/model-ab";
import {
  addOpenAIUsage,
  emptyLedger,
  refreshLedger,
  type CostLedger,
} from "../src/lib/quality/cost-guard";
import { liveJudgeWithUsage } from "../src/lib/quality/evaluate-agent";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs", "ops");
const KEYWORD = "Maschinen- und Anlagenführer";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const dryRun = hasFlag("dry-run");
  const plan = planModelAb(AB_MODELS);
  console.log(
    `plan: ${plan.unitTarget} units x ${plan.models.length} models, preflight ~€${plan.totalEur} (cap €${plan.budgetEur})`,
  );
  if (!plan.withinBudget) {
    console.error("STOP: preflight estimate exceeds the €3 cap");
    process.exit(2);
  }

  if (dryRun) {
    const md = renderReport({ runId, dryRun: true, plan, results: [] });
    mkdirSync(OUT_DIR, { recursive: true });
    const path = join(OUT_DIR, "AP22-MODEL-AB-DRYRUN.md");
    writeFileSync(path, md);
    console.log("dry-run report", path);
    return;
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  console.log("secrets", {
    ANTHROPIC_API_KEY: anthropicKey ? "PRESENT" : "MISSING",
    OPENAI_API_KEY: openaiKey ? "PRESENT" : "MISSING",
  });
  if (!anthropicKey || !openaiKey) {
    console.error("STOP: missing secrets");
    process.exit(2);
  }

  const targets = abChunkTargets();
  const results: AbModelResult[] = [];
  const cacheTokens: Record<string, { write: number; read: number }> = {};
  const ledgers: CostLedger[] = [];
  let judgeLedger = emptyLedger();

  for (const model of AB_MODELS) {
    if (abBudgetExceeded(...ledgers, judgeLedger)) {
      console.error(`BUDGET STOP before ${model}`);
      break;
    }
    const submitted = await submitChunkTargets({ keyword: KEYWORD, targets, model });
    console.log(model, "batch submitted", submitted.batchId);
    await pollBatchUntilDone(submitted.batchId, {
      intervalMs: 20_000,
      onTick: (s) => console.log(model, s.processing_status, s.request_counts),
    });
    const collected = await collectBatchUnits(submitted.batchId, model);
    ledgers.push(collected.ledger);
    cacheTokens[model] = {
      write: collected.ledger.claudeCacheWriteTokens ?? 0,
      read: collected.ledger.claudeCacheReadTokens ?? 0,
    };
    if (abBudgetExceeded(...ledgers, judgeLedger)) {
      console.error(`BUDGET STOP after generating ${model}; skipping judge`);
      break;
    }
    const judged = await liveJudgeWithUsage(openaiKey, unitsToEvalItems(collected.units));
    judgeLedger = addOpenAIUsage(
      judgeLedger,
      judged.usage.prompt_tokens,
      judged.usage.completion_tokens,
    );
    results.push(
      summarizeModel({
        model,
        units: collected.units,
        failedCustomIds: collected.failedCustomIds,
        evals: judged.questions,
        costUsd: collected.ledger.usdEstimate,
      }),
    );
  }

  const usd = [...ledgers, judgeLedger].reduce((s, l) => s + l.usdEstimate, 0);
  const totalEur = refreshLedger({ ...emptyLedger(), claudeUsd: usd }).eurEstimate;
  const md = renderReport({ runId, dryRun: false, plan, results, cacheTokens, totalEur });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `AP22-MODEL-AB-${runId}.md`), md);
  console.log(md);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
