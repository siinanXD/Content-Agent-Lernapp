/**
 * SIN-449: Goldset Industriekaufleute nach Langfuse (Datensatz `indkfl-goldset`) und Richter dagegen prüfen.
 * Kosten: wenige Cent (35 Fragen, ein Richter). Ergebnis in docs/quality/runs/ (PR über run-task).
 *
 * Usage: npm run quality:goldset-indkfl
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTENT_DIR, loadCurriculum } from "../src/lib/content/curriculum";
import { addOpenAIUsage, emptyLedger } from "../src/lib/quality/cost-guard";
import { JUDGE_MODEL, liveJudgeWithUsage, type EvalItem } from "../src/lib/quality/evaluate-agent";
import { checkGoldset, renderGoldsetCheck } from "../src/lib/quality/goldset-check";
import { INDKFL_GOLDSET, INDKFL_GOLDSET_ITEMS, LANGFUSE_INDKFL_DATASET } from "../src/lib/quality/indkfl-goldset";
import { ensureGoldsetDataset } from "../src/lib/quality/langfuse-client";
import { shutdownLangfuseOtel } from "../src/lib/quality/langfuse-otel";

const OUT_DIR = join(process.cwd(), "docs", "quality", "runs");

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.error("STOP: OPENAI_API_KEY fehlt (nur Name gemeldet)");
    process.exit(2);
  }
  const runId = new Date().toISOString().replace(/[:.]/g, "-");

  const sync = await ensureGoldsetDataset(INDKFL_GOLDSET_ITEMS, {
    name: LANGFUSE_INDKFL_DATASET,
    description: `${INDKFL_GOLDSET.description} ${INDKFL_GOLDSET.status}.`,
    idPrefix: "indkfl",
    retrievedAt: INDKFL_GOLDSET.retrievedAt,
  });
  const langfuse = sync ? `${sync.upserted} von ${INDKFL_GOLDSET_ITEMS.length} Einträgen im Datensatz ${sync.dataset}` : "nicht konfiguriert, Datensatz übersprungen";
  console.log(`Langfuse: ${langfuse}`);

  const map = loadCurriculum(join(CONTENT_DIR, "indkfl.json"));
  const mods = new Map(map.modules.map((m) => [m.id, m]));
  const items: EvalItem[] = INDKFL_GOLDSET_ITEMS.map((q) => {
    const mod = mods.get(q.moduleId);
    return {
      id: q.id,
      unitId: q.unitId,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
      moduleId: mod?.id,
      year: mod?.year ?? 1,
      niveauHint: mod?.niveau ?? "Grundstufe (vor Teil 1 der Abschlussprüfung)",
      safety: q.expected.safetyFlag,
    };
  });
  const judged = await liveJudgeWithUsage(key, items);
  const costUsd = addOpenAIUsage(emptyLedger(), judged.usage.prompt_tokens, judged.usage.completion_tokens).usdEstimate;
  const check = checkGoldset(INDKFL_GOLDSET_ITEMS, judged.questions);

  mkdirSync(OUT_DIR, { recursive: true });
  const base = `indkfl-goldset-check-${runId.slice(0, 10)}`;
  writeFileSync(join(OUT_DIR, `${base}.json`), JSON.stringify({ runId, dataset: LANGFUSE_INDKFL_DATASET, judgeModel: JUDGE_MODEL, costUsd, langfuse, check, judged: judged.questions }, null, 2) + "\n");
  writeFileSync(join(OUT_DIR, `${base}.md`), renderGoldsetCheck(check, { dataset: LANGFUSE_INDKFL_DATASET, judgeModel: JUDGE_MODEL, runId, costUsd, langfuse }, INDKFL_GOLDSET_ITEMS));
  console.log(`Richter wie erwartet: ${check.agree} von ${check.judged}; Gegenproben erkannt: ${check.gegenproben.erkannt} von ${check.gegenproben.total}; Kosten ${costUsd.toFixed(4)} USD`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownLangfuseOtel().catch(() => undefined);
  });
