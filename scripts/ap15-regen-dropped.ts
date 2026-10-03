/**
 * AP-15 / SIN-193 — regenerate the 110 quality-gate-dropped Phase A units.
 *
 * Keeps the 170 already-published units; regenerates only missing/dropped IDs
 * via Anthropic Console Batch, judges new units with gpt-5.4-mini, merges,
 * publishes to Supabase, updates Lernpfad snapshots.
 *
 * Usage:
 *   COURSE_STORAGE=supabase npm run ap15:regen-dropped
 *   COURSE_STORAGE=supabase npm run ap15:regen-dropped -- --dry-run
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  collectBatchUnits,
  mergePhaseLernfeld,
  missingChunkTargets,
  pollBatchUntilDone,
  submitChunkTargets,
  submitRegenBatch,
} from "../src/lib/generate/batch-generate";
import type { GeneratedUnit } from "../src/lib/generate/maf-lernfeld-seed";
import { loadMafCurriculum, modulesForPhase } from "../src/lib/content/curriculum";
import {
  addClaudeUsage,
  addOpenAIUsage,
  BUDGET_EUR,
  emptyLedger,
  refreshLedger,
  type CostLedger,
} from "../src/lib/quality/cost-guard";
import {
  liveJudgeWithUsage,
  type EvalItem,
} from "../src/lib/quality/evaluate-agent";
import {
  aggregateScores,
  type QuestionEval,
} from "../src/lib/quality/schemas";
import { recordEvaluationTrace, langfuseConfigured } from "../src/lib/quality/langfuse-client";
import { getStorage } from "../src/lib/storage";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs", "ops", "ap15-runs");
const COURSE = "e22073de-7020-4380-9002-c70d46c25e25";
const KEYWORD = "Maschinen- und Anlagenführer";
/** Prior cumulative from Phase A generate+judge+finish (~€12.8). */
const PRIOR_EUR = 12.8;
const STOP_EUR = 19.0;

const DROPPED_FALLBACK = [
  "LF1-1-u12",
  "LF1-2-u3",
  "LF1-2-u4",
  "LF1-2-u8",
  "LF1-3-u10",
  "LF1-3-u6",
  "LF1-3-u7",
  "LF1-3-u8",
  "LF1-3-u9",
  "LF1-4-u6",
  "LF1-5-u1",
  "LF1-5-u5",
  "LF1-5-u6",
  "LF1-5-u7",
  "LF1-6-u14",
  "LF1-6-u2",
  "LF1-6-u4",
  "LF1-6-u5",
  "LF1-6-u6",
  "LF1-6-u7",
  "LF1-6-u8",
  "LF1-7-u2",
  "LF1-7-u3",
  "LF1-8-u2",
  "LF1-8-u3",
  "LF1-8-u4",
  "LF1-8-u5",
  "LF1-8-u6",
  "LF1-8-u7",
  "LF1-8-u8",
  "LF1-9-u1",
  "LF1-9-u2",
  "LF1-9-u3",
  "LF1-9-u4",
  "LF2-1-u8",
  "LF2-2-u1",
  "LF2-2-u4",
  "LF2-2-u5",
  "LF2-2-u6",
  "LF2-2-u7",
  "LF2-2-u8",
  "LF2-2-u9",
  "LF2-3-u5",
  "LF2-3-u6",
  "LF2-3-u7",
  "LF2-4-u3",
  "LF2-4-u9",
  "LF2-5-u11",
  "LF2-5-u3",
  "LF2-5-u6",
  "LF2-6-u1",
  "LF2-6-u2",
  "LF2-6-u5",
  "LF2-6-u6",
  "LF2-7-u5",
  "LF2-7-u8",
  "LF2-7-u9",
  "LF2-8-u4",
  "LF2-9-u4",
  "LF2-9-u5",
  "M0-1-u1",
  "M0-1-u10",
  "M0-1-u11",
  "M0-1-u12",
  "M0-1-u13",
  "M0-1-u14",
  "M0-1-u3",
  "M0-1-u4",
  "M0-1-u6",
  "M0-2-u1",
  "M0-2-u10",
  "M0-2-u2",
  "M0-2-u6",
  "M0-2-u8",
  "M0-2-u9",
  "M0-3-u1",
  "M0-3-u10",
  "M0-3-u12",
  "M0-3-u15",
  "M0-3-u2",
  "M0-3-u3",
  "M0-3-u4",
  "M0-3-u9",
  "M0-4-u1",
  "M0-4-u11",
  "M0-4-u2",
  "M0-4-u3",
  "M0-4-u7",
  "M0-4-u8",
  "M0-4-u9",
  "PA-1-u2",
  "PA-3-u2",
  "PA-3-u3",
  "PA-3-u5",
  "PA-3-u6",
  "PA-3-u8",
  "PA-4-u3",
  "PA-4-u4",
  "PA-4-u6",
  "PA-5-u1",
  "PA-5-u4",
  "PA-5-u9",
  "PA-6-u3",
  "PA-6-u4",
  "PA-6-u5",
  "PA-7-u1",
  "PA-8-u1",
  "PA-8-u2",
  "PA-8-u3",
  "PA-8-u6",
] as const;

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function loadDroppedIds(): string[] {
  const reportPath = join(
    OUT_DIR,
    "2026-10-03T12-39-35-140Z-report.json",
  );
  if (existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      droppedUnitIds?: string[];
    };
    if (report.droppedUnitIds?.length) return report.droppedUnitIds;
  }
  return [...DROPPED_FALLBACK];
}

function parseUnitId(unitId: string): {
  moduleId: string;
  blockId: string;
  unitId: string;
} | null {
  const m = unitId.match(/^([A-Za-z0-9]+)-(\d+)-u(\d+)$/i);
  if (!m) return null;
  return {
    moduleId: m[1]!,
    blockId: `${m[1]}-${m[2]}`,
    unitId,
  };
}

function flattenUnits(units: GeneratedUnit[]): EvalItem[] {
  const curriculum = loadMafCurriculum();
  return units.flatMap((u) => {
    const mod = curriculum.modules.find((m) => m.id === u.moduleId);
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

function failingUnitIds(evals: QuestionEval[]): string[] {
  const failed = new Set<string>();
  for (const e of evals) {
    if (!e.passed) failed.add(e.unitId);
  }
  return [...failed];
}

function pickSafetySample(units: GeneratedUnit[], pct = 0.1): GeneratedUnit[] {
  const safety = units.filter((u) => u.safetyFlag);
  if (safety.length === 0) return [];
  const n = Math.max(1, Math.round(safety.length * pct));
  const sorted = [...safety].sort((a, b) => a.id.localeCompare(b.id, "de"));
  const step = Math.max(1, Math.floor(sorted.length / n));
  const sample: GeneratedUnit[] = [];
  for (let i = 0; i < sorted.length && sample.length < n; i += step) {
    sample.push(sorted[i]!);
  }
  return sample;
}

function totalEur(runLedger: CostLedger): number {
  return Math.round((PRIOR_EUR + runLedger.eurEstimate) * 100) / 100;
}

function budgetStop(runLedger: CostLedger, label: string): boolean {
  const total = totalEur(runLedger);
  if (total >= STOP_EUR || runLedger.stopped) {
    console.error(
      `BUDGET STOP at ${label}: prior €${PRIOR_EUR} + run €${runLedger.eurEstimate} = €${total} (stop≥€${STOP_EUR}, hard €${BUDGET_EUR})`,
    );
    return true;
  }
  return false;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");

  const secrets = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() ? "PRESENT" : "MISSING",
    ANTHROPIC_WORKSPACE_ID: process.env.ANTHROPIC_WORKSPACE_ID?.trim()
      ? "PRESENT"
      : "MISSING",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() ? "PRESENT" : "MISSING",
    LANGFUSE: langfuseConfigured() ? "PRESENT" : "MISSING",
    SUPABASE_URL: process.env.SUPABASE_URL?.trim() ? "PRESENT" : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      ? "PRESENT"
      : "MISSING",
  };
  console.log("secrets", secrets);
  if (Object.values(secrets).some((v) => v === "MISSING")) {
    console.error("STOP: missing secrets");
    process.exit(2);
  }

  const storage = getStorage();
  if (storage.backend !== "supabase") {
    console.error("STOP: need COURSE_STORAGE=supabase (got", storage.backend, ")");
    process.exit(2);
  }

  const course = await storage.getCourse(COURSE);
  if (!course) {
    console.error("STOP: course missing", COURSE);
    process.exit(2);
  }

  const priorUnits =
    (course.generated as { units?: GeneratedUnit[] } | undefined)?.units ?? [];
  const have = new Set(priorUnits.map((u) => u.id));
  const droppedIds = loadDroppedIds().filter((id) => !have.has(id));
  const missingChunks = missingChunkTargets(have, "A");

  console.log(
    JSON.stringify({
      courseId: COURSE,
      status: course.status,
      priorUnits: priorUnits.length,
      droppedToRegen: droppedIds.length,
      missingChunks: missingChunks.length,
      priorEur: PRIOR_EUR,
      budgetEur: BUDGET_EUR,
      stopEur: STOP_EUR,
    }),
  );

  if (hasFlag("dry-run")) {
    writeFileSync(
      join(OUT_DIR, `${runId}-regen-dry-run.json`),
      JSON.stringify(
        {
          courseId: COURSE,
          priorUnits: priorUnits.length,
          droppedIds,
          missingChunks: missingChunks.map((t) => t.customId),
        },
        null,
        2,
      ),
    );
    console.log("dry-run ok");
    return;
  }

  if (droppedIds.length === 0 && missingChunks.length === 0) {
    console.log("nothing to regenerate — already complete");
    process.exit(0);
  }

  let ledger: CostLedger = emptyLedger();
  const specs = droppedIds
    .map(parseUnitId)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => ({
      moduleId: s.moduleId,
      blockId: s.blockId,
      unitId: s.unitId,
      titleHint: s.unitId,
    }));

  let batchId: string;
  if (specs.length > 0) {
    console.log("submitRegenBatch units", specs.length);
    const submitted = await submitRegenBatch({ keyword: KEYWORD, unitSpecs: specs });
    batchId = submitted.batchId;
    console.log("regen batch", batchId, "chunks", submitted.chunkCount);
  } else {
    console.log("submitChunkTargets missing", missingChunks.length);
    const submitted = await submitChunkTargets({
      keyword: KEYWORD,
      targets: missingChunks,
    });
    batchId = submitted.batchId;
    console.log("chunk batch", batchId, "chunks", submitted.chunkCount);
  }

  writeFileSync(
    join(OUT_DIR, `${runId}-regen-batch.json`),
    JSON.stringify({ courseId: COURSE, batchId, specs: specs.length }, null, 2),
  );

  await pollBatchUntilDone(batchId, {
    intervalMs: 20_000,
    onTick: (s) => {
      const c = s.request_counts;
      console.log(
        `batch ${s.processing_status}`,
        c
          ? `ok=${c.succeeded ?? 0} err=${c.errored ?? 0} proc=${c.processing ?? 0}`
          : "",
      );
    },
  });

  const collected = await collectBatchUnits(batchId);
  ledger = addClaudeUsage(
    ledger,
    collected.ledger.claudeInputTokens,
    collected.ledger.claudeOutputTokens,
  );
  console.log(
    `collected new=${collected.units.length} failed=${collected.failedCustomIds.length} run€=${ledger.eurEstimate} total€=${totalEur(ledger)}`,
  );

  if (budgetStop(ledger, "after-generate")) {
    writeReport(runId, batchId, priorUnits, [], ledger, "budget_stop_after_generate");
    process.exit(3);
  }

  let newUnits = collected.units;
  const openaiKey = process.env.OPENAI_API_KEY!.trim();

  // Judge only regenerated units — keep prior 170 as already published passers
  let evalItems = flattenUnits(newUnits);
  let judged = await liveJudgeWithUsage(openaiKey, evalItems);
  ledger = addOpenAIUsage(
    ledger,
    judged.usage.prompt_tokens,
    judged.usage.completion_tokens,
  );
  let failedIds = failingUnitIds(judged.questions);
  console.log(
    `judge new pass=${judged.questions.filter((q) => q.passed).length}/${judged.questions.length} failUnits=${failedIds.length} run€=${ledger.eurEstimate} total€=${totalEur(ledger)}`,
  );

  if (budgetStop(ledger, "after-judge")) {
    writeReport(runId, batchId, priorUnits, newUnits, ledger, "budget_stop_after_judge");
    process.exit(3);
  }

  // One regen of still-failing new units
  if (failedIds.length && !budgetStop(ledger, "pre-second-regen")) {
    const byId = new Map(newUnits.map((u) => [u.id, u]));
    const retrySpecs = failedIds
      .map((id) => byId.get(id))
      .filter((u): u is GeneratedUnit => Boolean(u))
      .map((u) => ({
        moduleId: u.moduleId ?? parseUnitId(u.id)?.moduleId ?? "M0",
        blockId: u.blockId ?? parseUnitId(u.id)?.blockId ?? "M0-1",
        unitId: u.id,
        titleHint: u.title,
      }));
    if (retrySpecs.length) {
      console.log("second regen", retrySpecs.length);
      const regen = await submitRegenBatch({
        keyword: KEYWORD,
        unitSpecs: retrySpecs,
      });
      await pollBatchUntilDone(regen.batchId, {
        intervalMs: 20_000,
        onTick: (s) => console.log("regen2", s.processing_status, s.request_counts),
      });
      const regenCollected = await collectBatchUnits(regen.batchId);
      ledger = addClaudeUsage(
        ledger,
        regenCollected.ledger.claudeInputTokens,
        regenCollected.ledger.claudeOutputTokens,
      );
      const replaced = new Map(newUnits.map((u) => [u.id, u]));
      for (const u of regenCollected.units) replaced.set(u.id, u);
      newUnits = [...replaced.values()];
      batchId = `${batchId}+${regen.batchId}`;

      evalItems = flattenUnits(newUnits);
      judged = await liveJudgeWithUsage(openaiKey, evalItems);
      ledger = addOpenAIUsage(
        ledger,
        judged.usage.prompt_tokens,
        judged.usage.completion_tokens,
      );
      failedIds = failingUnitIds(judged.questions);
      console.log(
        `after second regen failUnits=${failedIds.length} run€=${ledger.eurEstimate} total€=${totalEur(ledger)}`,
      );
    }
  }

  const failSet = new Set(failedIds);
  const newPublishable = newUnits.filter((u) => !failSet.has(u.id));
  const stillDropped = newUnits.filter((u) => failSet.has(u.id));

  // Merge: prior published + new passers (new wins on id collision)
  const merged = mergePhaseLernfeld([...priorUnits, ...newPublishable]);
  await storage.setGenerated(COURSE, merged);

  const passEvals = judged.questions.filter((q) =>
    newPublishable.some((u) => u.id === q.unitId),
  );
  const scores = aggregateScores(passEvals);
  const publishedCount = merged.units.length;
  const passed = publishedCount > 0;

  const evaluation = {
    courseId: COURSE,
    passed,
    scores,
    questions: passEvals,
    threshold: {
      sourceFidelity: 1,
      uniqueness: 1,
      niveauMin: 4,
      languageMin: 4,
    },
    mode: "live" as const,
    modelId: "gpt-5.4-mini",
    warning:
      stillDropped.length > 0
        ? `Regen pass: ${newPublishable.length} recovered, ${stillDropped.length} still dropped after 2× regen`
        : `Regen pass: ${newPublishable.length} recovered; total published ${publishedCount}/280`,
  };

  const tid = await recordEvaluationTrace({
    name: "ap15-regen-dropped",
    courseId: COURSE,
    passed,
    scores: {
      sourceFidelity: scores.sourceFidelity,
      uniqueness: scores.uniqueness,
      niveau: scores.niveau,
      language: scores.language,
      safetyFlag: scores.safetyFlag,
    },
    metadata: {
      phase: "A",
      unitsPublished: publishedCount,
      unitsRecovered: newPublishable.length,
      unitsStillDropped: stillDropped.length,
      batchId,
      costEurRun: ledger.eurEstimate,
      costEurTotal: totalEur(ledger),
      priorEur: PRIOR_EUR,
      apiPath: "console_batch_with_workspace_header",
    },
  });
  if (tid) (evaluation as { langfuseTraceId?: string }).langfuseTraceId = tid;
  await storage.setEvaluation(COURSE, evaluation);

  if (passed) {
    await storage.setStatus(COURSE, "published");
  }

  const sample = pickSafetySample(merged.units, 0.1);
  writeFileSync(
    join(OUT_DIR, `${runId}-safety-sample.json`),
    JSON.stringify(
      {
        note: "10% Stichprobe nach Regen der 110 Dropped Units",
        sampledAt: new Date().toISOString(),
        sampleCount: sample.length,
        unitIds: sample.map((u) => u.id),
      },
      null,
      2,
    ),
  );

  // Slim learner snapshot (units live in Supabase)
  const pathSnapshot = join(ROOT, "src", "lib", "learner", "phase-a-published.json");
  writeFileSync(
    pathSnapshot,
    JSON.stringify(
      {
        courseId: COURSE,
        keyword: KEYWORD,
        phase: "A",
        publishedAt: new Date().toISOString(),
        modules: modulesForPhase(loadMafCurriculum(), "A").map((m) => ({
          id: m.id,
          title: m.title,
        })),
        unitCount: merged.units.length,
        units: [],
      },
      null,
      2,
    ),
  );

  // Update phase-a-index summary
  const indexPath = join(ROOT, "src", "lib", "learner", "phase-a-index.json");
  const byModule = Object.fromEntries(
    ["M0", "LF1", "LF2", "PA"].map((m) => [
      m,
      merged.units.filter((u) => u.moduleId === m).length,
    ]),
  );
  writeFileSync(
    indexPath,
    JSON.stringify(
      {
        courseId: COURSE,
        phase: "A",
        unitCount: merged.units.length,
        target: 280,
        shortfall: Math.max(0, 280 - merged.units.length),
        byModule,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  writeReport(
    runId,
    batchId,
    merged.units,
    stillDropped,
    ledger,
    passed ? "published" : "not_published",
    {
      langfuseTraceId: tid,
      recovered: newPublishable.length,
      priorPublished: priorUnits.length,
      safetySample: sample.map((u) => u.id),
      byModule,
    },
  );

  console.log(
    JSON.stringify(
      {
        courseId: COURSE,
        published: passed,
        totalUnits: merged.units.length,
        recovered: newPublishable.length,
        stillDropped: stillDropped.length,
        runEur: ledger.eurEstimate,
        totalEur: totalEur(ledger),
        batchId,
      },
      null,
      2,
    ),
  );

  if (totalEur(ledger) >= STOP_EUR) process.exit(3);
  if (merged.units.length < 280) process.exit(4);
}

function writeReport(
  runId: string,
  batchId: string,
  units: GeneratedUnit[],
  dropped: GeneratedUnit[],
  ledger: CostLedger,
  status: string,
  extra?: Record<string, unknown>,
) {
  ledger = refreshLedger(ledger);
  const byModule = Object.fromEntries(
    ["M0", "LF1", "LF2", "PA"].map((m) => [
      m,
      units.filter((u) => u.moduleId === m).length,
    ]),
  );
  const report = {
    runId,
    courseId: COURSE,
    batchId,
    status,
    unitCount: units.length,
    droppedCount: dropped.length,
    droppedUnitIds: dropped.map((u) => u.id),
    byModule,
    ledger,
    priorEur: PRIOR_EUR,
    totalEurApprox: totalEur(ledger),
    apiBilling: "Anthropic Console (workspace header) — not Claude Max subscription",
    ...extra,
  };
  writeFileSync(join(OUT_DIR, `${runId}-regen-report.json`), JSON.stringify(report, null, 2));
  writeFileSync(
    join(ROOT, "docs", "ops", "AP15-PHASE-A.md"),
    `# AP-15 Phase A Run

**Linear:** [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193)  
**Kurs:** \`${COURSE}\`  
**API:** Anthropic **Console** Batch (\`anthropic-workspace-id\`) — nicht Claude Max/Mac-Abo  
**Regen-Batch:** \`${batchId}\`  
**Status:** ${status}  
**Einheiten veröffentlicht:** ${units.length} / 280 Ziel  
**Nach Regen noch verworfen:** ${dropped.length}  
**Kosten Regen-Lauf:** ~€${ledger.eurEstimate}  
**Kosten kumuliert (Schätzung):** ~€${totalEur(ledger)} (Deckel €${BUDGET_EUR}; Prior ~€${PRIOR_EUR})  
**Module:** M0=${byModule.M0}, LF1=${byModule.LF1}, LF2=${byModule.LF2}, PA=${byModule.PA}

Artifacts: \`docs/ops/ap15-runs/${runId}-*\`  
Learner-Snapshot: \`src/lib/learner/phase-a-published.json\` (slim; Units in Supabase)
`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
