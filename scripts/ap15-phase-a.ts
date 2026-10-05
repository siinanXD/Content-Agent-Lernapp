/**
 * AP-15 / SIN-193 — Phase A live generation (M0, LF1, LF2, PA = 280 units).
 *
 * Steps: secret check → submit Batch → poll → persist Supabase → judge →
 * regenerate rejects once → safety 10% sample note → publish passers → cost report.
 *
 * Usage:
 *   npm run ap15:phase-a
 *   npm run ap15:phase-a -- --resume-batch=<id>
 *   npm run ap15:phase-a -- --dry-run
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectBatchUnits,
  mergePhaseLernfeld,
  missingChunkTargets,
  phaseAChunks,
  pollBatchUntilDone,
  submitChunkTargets,
  submitPhaseBatch,
  submitRegenBatch,
} from "../src/lib/generate/batch-generate";
import type { GeneratedUnit } from "../src/lib/generate/maf-lernfeld-seed";
import { loadMafCurriculum, modulesForPhase } from "../src/lib/content/curriculum";
import {
  addClaudeLedger,
  addOpenAIUsage,
  BUDGET_EUR,
  emptyLedger,
  phaseAPreflightUsd,
  refreshLedger,
  type CostLedger,
} from "../src/lib/quality/cost-guard";
import {
  JUDGE_PROMPT_VERSION,
  liveJudgeWithUsage,
  type EvalItem,
} from "../src/lib/quality/evaluate-agent";
import {
  aggregateScores,
  scoresPass,
  type EvaluateResult,
  type QuestionEval,
} from "../src/lib/quality/schemas";
import {
  recordClaudeUsageTrace,
  recordEvaluationTrace,
  langfuseConfigured,
} from "../src/lib/quality/langfuse-client";
import { toQuestionEvaluationRecords } from "../src/lib/quality/question-evaluations";
import { getStorage } from "../src/lib/storage";
import { runResearchAgent } from "../src/lib/research/research-agent";
import { runPlanAgent } from "../src/lib/plan/plan-agent";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs", "ops", "ap15-runs");
const KEYWORD = "Maschinen- und Anlagenführer";

function argFlag(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function requireSecrets(): Record<string, "PRESENT" | "MISSING"> {
  const keys = [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_WORKSPACE_ID",
    "OPENAI_API_KEY",
    "LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_SECRET_KEY",
    "LANGFUSE_BASE_URL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const status = {} as Record<string, "PRESENT" | "MISSING">;
  for (const k of keys) {
    status[k] = process.env[k]?.trim() ? "PRESENT" : "MISSING";
  }
  return status;
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
  // Deterministic sample: every k-th by sorted id
  const sorted = [...safety].sort((a, b) => a.id.localeCompare(b.id, "de"));
  const step = Math.max(1, Math.floor(sorted.length / n));
  const sample: GeneratedUnit[] = [];
  for (let i = 0; i < sorted.length && sample.length < n; i += step) {
    sample.push(sorted[i]!);
  }
  return sample;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const secrets = requireSecrets();
  console.log("secrets", secrets);

  const missing = Object.entries(secrets)
    .filter(([, v]) => v === "MISSING")
    .map(([k]) => k);
  if (missing.length) {
    console.error("STOP: missing secrets:", missing.join(", "));
    writeFileSync(
      join(OUT_DIR, `${runId}-blocked.json`),
      JSON.stringify({ runId, secrets, missing }, null, 2),
    );
    process.exit(2);
  }

  if (!langfuseConfigured()) {
    console.error("STOP: Langfuse not configured");
    process.exit(2);
  }

  const { unitTarget, targets } = phaseAChunks("A");
  const preflight = phaseAPreflightUsd(unitTarget);
  console.log(
    `Phase A: ${unitTarget} units, ${targets.length} batch chunks, preflight ~$${preflight} (budget €${BUDGET_EUR})`,
  );
  if (preflight > 18) {
    console.warn("Preflight near budget — will stop if ledger approaches €20");
  }

  if (hasFlag("dry-run")) {
    writeFileSync(
      join(OUT_DIR, `${runId}-dry-run.json`),
      JSON.stringify({ unitTarget, chunkCount: targets.length, preflight, secrets }, null, 2),
    );
    console.log("dry-run ok");
    return;
  }

  const storage = getStorage();
  if (storage.backend !== "supabase") {
    console.error("STOP: COURSE_STORAGE is mock — need live Supabase");
    process.exit(2);
  }

  let ledger: CostLedger = emptyLedger();
  const priorCourse = argFlag("course-id");
  let course = priorCourse
    ? await storage.getCourse(priorCourse)
    : undefined;
  if (!course) {
    course = await storage.createCourse(KEYWORD, 2);
    console.log("course", course.id, "backend", storage.backend);
    const research = await runResearchAgent(KEYWORD);
    await storage.setSources(course.id, research.sources);
    const plan = await runPlanAgent(KEYWORD);
    await storage.setPlan(course.id, plan.variants);
  } else {
    console.log("reusing course", course.id, "backend", storage.backend);
  }

  let batchId = argFlag("resume-batch");
  let unitsAccum: import("../src/lib/generate/maf-lernfeld-seed").GeneratedUnit[] =
    [];

  const priorGen = course.generated as
    | { units?: import("../src/lib/generate/maf-lernfeld-seed").GeneratedUnit[] }
    | undefined;
  if (priorGen?.units?.length) {
    unitsAccum = [...priorGen.units];
    console.log("loaded prior course units", unitsAccum.length);
  }

  if (!batchId) {
    const have = new Set(unitsAccum.map((u) => u.id));
    const missing = missingChunkTargets(have, "A");
    const submitted =
      missing.length === targets.length
        ? await submitPhaseBatch({ keyword: KEYWORD, phaseId: "A" })
        : await submitChunkTargets({ keyword: KEYWORD, targets: missing });
    batchId = submitted.batchId;
    console.log(
      "batch submitted",
      batchId,
      "chunks",
      submitted.chunkCount,
      "missingUnits~",
      submitted.unitTarget,
    );
    writeFileSync(
      join(OUT_DIR, `${runId}-batch.json`),
      JSON.stringify({ courseId: course.id, ...submitted }, null, 2),
    );
  } else {
    console.log("resuming batch", batchId);
  }

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
  ledger = addClaudeLedger(ledger, collected.ledger);
  unitsAccum = mergePhaseLernfeld([...unitsAccum, ...collected.units]).units;
  console.log(
    `collected units=${collected.units.length} total=${unitsAccum.length} failedChunks=${collected.failedCustomIds.length} cost~€${ledger.eurEstimate}`,
  );

  // One automatic retry for still-missing slots (new max_tokens / smaller chunks).
  const haveAfter = new Set(unitsAccum.map((u) => u.id));
  const stillMissing = missingChunkTargets(haveAfter, "A");
  if (stillMissing.length > 0 && !ledger.stopped && !hasFlag("no-retry")) {
    console.log("retry missing chunks", stillMissing.length);
    if (ledger.eurEstimate > 14) {
      console.warn("approaching budget — skipping retry batch");
    } else {
      const retry = await submitChunkTargets({
        keyword: KEYWORD,
        targets: stillMissing,
      });
      await pollBatchUntilDone(retry.batchId, {
        intervalMs: 20_000,
        onTick: (s) => console.log("retry", s.processing_status, s.request_counts),
      });
      const retryCollected = await collectBatchUnits(retry.batchId);
      ledger = addClaudeLedger(ledger, retryCollected.ledger);
      unitsAccum = mergePhaseLernfeld([
        ...unitsAccum,
        ...retryCollected.units,
      ]).units;
      batchId = `${batchId}+${retry.batchId}`;
      console.log(
        `after retry total=${unitsAccum.length} cost~€${ledger.eurEstimate}`,
      );
    }
  }

  if (ledger.stopped) {
    writeReport(runId, course.id, batchId, unitsAccum, [], ledger, "budget_stop_after_generate");
    process.exit(3);
  }

  let lernfeld = mergePhaseLernfeld(unitsAccum);
  await storage.setGenerated(course.id, lernfeld);

  const openaiKey = process.env.OPENAI_API_KEY!.trim();
  let evalItems = flattenUnits(lernfeld.units);
  let judged = await liveJudgeWithUsage(openaiKey, evalItems);
  ledger = addOpenAIUsage(
    ledger,
    judged.usage.prompt_tokens,
    judged.usage.completion_tokens,
  );
  console.log(
    `judge pass=${judged.questions.filter((q) => q.passed).length}/${judged.questions.length} cost~€${ledger.eurEstimate}`,
  );

  // Regenerate rejected units once
  let failedIds = failingUnitIds(judged.questions);
  if (failedIds.length && !ledger.stopped) {
    const byId = new Map(lernfeld.units.map((u) => [u.id, u]));
    const specs = failedIds
      .map((id) => byId.get(id))
      .filter((u): u is GeneratedUnit => Boolean(u))
      .map((u) => ({
        moduleId: u.moduleId ?? "M0",
        blockId: u.blockId ?? "M0-3",
        unitId: u.id,
        titleHint: u.title,
      }));
    console.log("regen once", specs.length, "units");
    if (specs.length) {
      const regen = await submitRegenBatch({ keyword: KEYWORD, unitSpecs: specs });
      await pollBatchUntilDone(regen.batchId, {
        intervalMs: 20_000,
        onTick: (s) => console.log("regen", s.processing_status, s.request_counts),
      });
      const regenCollected = await collectBatchUnits(regen.batchId);
      ledger = addClaudeLedger(ledger, regenCollected.ledger);
      const replaced = new Map(lernfeld.units.map((u) => [u.id, u]));
      for (const u of regenCollected.units) replaced.set(u.id, u);
      lernfeld = mergePhaseLernfeld([...replaced.values()]);
      await storage.setGenerated(course.id, lernfeld);

      evalItems = flattenUnits(lernfeld.units);
      judged = await liveJudgeWithUsage(openaiKey, evalItems);
      ledger = addOpenAIUsage(
        ledger,
        judged.usage.prompt_tokens,
        judged.usage.completion_tokens,
      );
      failedIds = failingUnitIds(judged.questions);
      console.log(
        `after regen failUnits=${failedIds.length} cost~€${ledger.eurEstimate}`,
      );
    }
  }

  // Keep only units whose questions all pass
  const failSet = new Set(failedIds);
  const publishable = lernfeld.units.filter((u) => !failSet.has(u.id));
  const dropped = lernfeld.units.filter((u) => failSet.has(u.id));
  lernfeld = { ...lernfeld, units: publishable };

  const sample = pickSafetySample(publishable, 0.1);
  const samplePath = join(OUT_DIR, `${runId}-safety-sample.json`);
  writeFileSync(
    samplePath,
    JSON.stringify(
      {
        note: "10% Stichprobe safety-Einheiten für Sinan-Review vor Live (SIN-193). Keine Secrets.",
        sampledAt: new Date().toISOString(),
        safetyUnitCount: publishable.filter((u) => u.safetyFlag).length,
        sampleCount: sample.length,
        unitIds: sample.map((u) => u.id),
        units: sample.map((u) => ({
          id: u.id,
          title: u.title,
          moduleId: u.moduleId,
          blockId: u.blockId,
          explanation: u.explanation,
          questions: u.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            correct: q.correct,
            explanation: q.explanation,
            sourceUrl: q.sourceUrl,
          })),
        })),
      },
      null,
      2,
    ),
  );
  // Also mirror under docs/ops for humans
  writeFileSync(
    join(ROOT, "docs", "ops", "AP15-SAFETY-SAMPLE.md"),
    `# AP-15 Safety-Stichprobe (10 %)

**Für:** Sinan-Review vor Live von ` + "`safetyFlag`" + `-Einheiten  
**Lauf:** ${runId}  
**Kurs:** \`${course.id}\`  
**Stichprobe:** ${sample.length} von ${publishable.filter((u) => u.safetyFlag).length} Safety-Einheiten  

Vollständige JSON: \`docs/ops/ap15-runs/${runId}-safety-sample.json\`

| ID | Modul | Block | Titel |
| --- | --- | --- | --- |
${sample.map((u) => `| ${u.id} | ${u.moduleId} | ${u.blockId} | ${u.title} |`).join("\n")}

Nach Review: Stichprobe abhaken; bei inhaltlichen Fehlern Units über \`/refresh\` neu erzeugen.
`,
  );

  await storage.setGenerated(course.id, lernfeld);
  const passEvals = judged.questions.filter((q) => publishable.some((u) => u.id === q.unitId));
  const scores = aggregateScores(passEvals);
  const passed =
    publishable.length > 0 &&
    passEvals.length > 0 &&
    passEvals.every((q) => scoresPass(q.scores));

  const evaluation = {
    courseId: course.id,
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
    runId,
    promptVersion: JUDGE_PROMPT_VERSION,
    warning:
      dropped.length > 0
        ? `${dropped.length} units dropped after one regen`
        : undefined,
  };

  const tid = await recordEvaluationTrace({
    name: "ap15-phase-a",
    courseId: course.id,
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
      unitsPublished: publishable.length,
      unitsDropped: dropped.length,
      batchId,
      costEur: ledger.eurEstimate,
      costUsd: ledger.usdEstimate,
      safetySamplePath: samplePath,
    },
  });
  if (tid) (evaluation as { langfuseTraceId?: string }).langfuseTraceId = tid;

  await storage.setEvaluation(course.id, evaluation);
  await storage.appendQuestionEvaluations(
    toQuestionEvaluationRecords(evaluation as EvaluateResult),
  );
  await recordClaudeUsageTrace({
    name: "ap15-phase-a-claude-usage",
    courseId: course.id,
    ledger,
  });

  let published = false;
  if (passed && !ledger.stopped) {
    await storage.setStatus(course.id, "published");
    published = true;
  }

  // Snapshot for learner path (no secrets)
  const pathSnapshot = join(ROOT, "src", "lib", "learner", "phase-a-published.json");
  writeFileSync(
    pathSnapshot,
    JSON.stringify(
      {
        courseId: course.id,
        keyword: KEYWORD,
        phase: "A",
        publishedAt: new Date().toISOString(),
        modules: modulesForPhase(loadMafCurriculum(), "A").map((m) => ({
          id: m.id,
          title: m.title,
        })),
        unitCount: lernfeld.units.length,
        units: lernfeld.units,
      },
      null,
      2,
    ),
  );

  writeReport(runId, course.id, batchId, publishable, dropped, ledger, published ? "published" : "not_published", {
    langfuseTraceId: tid,
    safetySample: sample.map((u) => u.id),
    evaluationPassed: passed,
  });

  console.log(
    JSON.stringify(
      {
        courseId: course.id,
        published,
        units: publishable.length,
        dropped: dropped.length,
        costEur: ledger.eurEstimate,
        costUsd: ledger.usdEstimate,
        safetySample: sample.length,
      },
      null,
      2,
    ),
  );

  if (ledger.stopped) process.exit(3);
  if (!published) process.exit(4);
}

function writeReport(
  runId: string,
  courseId: string,
  batchId: string,
  units: GeneratedUnit[],
  dropped: GeneratedUnit[],
  ledger: CostLedger,
  status: string,
  extra?: Record<string, unknown>,
) {
  ledger = refreshLedger(ledger);
  const report = {
    runId,
    courseId,
    batchId,
    status,
    unitCount: units.length,
    droppedCount: dropped.length,
    byModule: Object.fromEntries(
      ["M0", "LF1", "LF2", "PA"].map((m) => [
        m,
        units.filter((u) => u.moduleId === m).length,
      ]),
    ),
    ledger,
    ...extra,
  };
  writeFileSync(join(OUT_DIR, `${runId}-report.json`), JSON.stringify(report, null, 2));
  writeFileSync(
    join(ROOT, "docs", "ops", "AP15-PHASE-A.md"),
    `# AP-15 Phase A Run

**Linear:** [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193)  
**Kurs:** \`${courseId}\`  
**Batch:** \`${batchId}\`  
**Status:** ${status}  
**Einheiten veröffentlicht:** ${units.length} (Ziel 280)  
**Verworfen nach 1× Regen:** ${dropped.length}  
**Kosten (Schätzung):** ~€${ledger.eurEstimate} / $${ledger.usdEstimate} (Deckel €${BUDGET_EUR})  
**Module:** M0=${report.byModule.M0}, LF1=${report.byModule.LF1}, LF2=${report.byModule.LF2}, PA=${report.byModule.PA}

Artifacts: \`docs/ops/ap15-runs/${runId}-*\`  
Safety-Stichprobe: \`docs/ops/AP15-SAFETY-SAMPLE.md\`  
Learner-Snapshot: \`src/lib/learner/phase-a-published.json\`
`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
