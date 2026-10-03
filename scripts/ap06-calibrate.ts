import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAF_GOLDSET_ITEMS } from "../src/lib/quality/maf-goldset";
import { JUDGE_MODEL, liveJudge } from "../src/lib/quality/evaluate-agent";
import { scoresPass } from "../src/lib/quality/schemas";
import { ensureGoldsetDataset } from "../src/lib/quality/langfuse-client";
import { shutdownLangfuseOtel } from "../src/lib/quality/langfuse-otel";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function estimateUsd(promptTokens: number, completionTokens: number): number {
  // gpt-5.4-mini list price D-07: $0.75 / $4.50 per 1M tokens
  return (promptTokens * 0.75 + completionTokens * 4.5) / 1_000_000;
}

async function main() {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY required for calibration");
  }

  const items = MAF_GOLDSET_ITEMS.map((q) => ({
    id: q.id,
    unitId: q.unitId,
    prompt: q.prompt,
    correct: q.correct,
    explanation: q.explanation,
    sourceUrl: q.sourceUrl,
  }));

  const judged = await liveJudge(openaiKey, items);
  const passing = judged.filter((q) => scoresPass(q.scores));
  if (passing.length === 0) {
    throw new Error(
      "Judge returned 0 passing goldset items — check prompt/schema before publishing a target",
    );
  }
  const n = passing.length;
  const niveau =
    Math.round((passing.reduce((s, q) => s + q.scores.niveau, 0) / n) * 10) / 10;
  const language =
    Math.round((passing.reduce((s, q) => s + q.scores.language, 0) / n) * 10) / 10;
  const fidelityOk = passing.every((q) => q.scores.sourceFidelity === 1) ? 1 : 0;
  const uniqueOk = passing.every((q) => q.scores.uniqueness === 1) ? 1 : 0;

  // Conservative cost ceiling from item count (actual usage is logged per call internally).
  const costUsdEstimate = estimateUsd(items.length * 450, items.length * 180);

  const calibratedAt = new Date().toISOString();
  const target = {
    sourceFidelity: fidelityOk,
    uniqueness: uniqueOk,
    niveau: Math.max(4, niveau),
    language: Math.max(4, language),
    sampleSize: 70,
    judgedCount: judged.length,
    passingCount: passing.length,
    failingIds: judged.filter((q) => !q.passed).map((q) => q.questionId),
    modelId: JUDGE_MODEL,
    calibratedAt,
    note: "Live OpenAI judge on 70 AO/BIBB practice items; IHK exams not used.",
    costUsdEstimate: Math.round(costUsdEstimate * 10000) / 10000,
  };

  if (costUsdEstimate > 20) {
    throw new Error(`Stop: estimated judge cost ${costUsdEstimate} USD exceeds €20 cap`);
  }

  writeFileSync(
    join(root, "docs/quality/calibration.json"),
    JSON.stringify(target, null, 2) + "\n",
  );

  const ts = `/**
 * Calibrated goldset target (AP-06).
 * Generated ${calibratedAt} by scripts/ap06-calibrate.ts — do not hand-edit.
 */
export const GOLDSET_TARGET = {
  sourceFidelity: ${target.sourceFidelity},
  uniqueness: ${target.uniqueness},
  niveau: ${target.niveau},
  language: ${target.language},
  sampleSize: ${target.sampleSize},
  judgedCount: ${target.judgedCount},
  modelId: ${JSON.stringify(target.modelId)},
  calibratedAt: ${JSON.stringify(target.calibratedAt)},
  note: ${JSON.stringify(target.note)},
  costUsdEstimate: ${target.costUsdEstimate},
} as const;

export type GoldsetTarget = typeof GOLDSET_TARGET;
`;
  writeFileSync(join(root, "src/lib/quality/goldset-target.ts"), ts);

  const uploaded = await ensureGoldsetDataset(MAF_GOLDSET_ITEMS);
  console.log(
    JSON.stringify(
      {
        calibrated: target,
        langfuse: uploaded,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownLangfuseOtel();
  });
