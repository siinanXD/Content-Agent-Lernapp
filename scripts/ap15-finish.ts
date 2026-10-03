import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getStorage } from "../src/lib/storage";
import { loadMafCurriculum, modulesForPhase } from "../src/lib/content/curriculum";
import { liveJudgeWithUsage, type EvalItem } from "../src/lib/quality/evaluate-agent";
import { aggregateScores, scoresPass, type QuestionEval } from "../src/lib/quality/schemas";
import { recordEvaluationTrace } from "../src/lib/quality/langfuse-client";
import {
  addOpenAIUsage,
  emptyLedger,
  refreshLedger,
  type CostLedger,
} from "../src/lib/quality/cost-guard";
import type { GeneratedUnit } from "../src/lib/generate/maf-lernfeld-seed";
import { mergePhaseLernfeld } from "../src/lib/generate/batch-generate";

const COURSE = "e22073de-7020-4380-9002-c70d46c25e25";
const OUT = join("docs", "ops", "ap15-runs");
const ROOT = process.cwd();

function flatten(units: GeneratedUnit[]): EvalItem[] {
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

function failingUnits(evals: QuestionEval[]): string[] {
  const s = new Set<string>();
  for (const e of evals) if (!e.passed) s.add(e.unitId);
  return [...s];
}

function pickSafetySample(units: GeneratedUnit[], pct = 0.1): GeneratedUnit[] {
  const safety = units.filter((u) => u.safetyFlag);
  if (!safety.length) return [];
  const n = Math.max(1, Math.round(safety.length * pct));
  const sorted = [...safety].sort((a, b) => a.id.localeCompare(b.id, "de"));
  const step = Math.max(1, Math.floor(sorted.length / n));
  const sample: GeneratedUnit[] = [];
  for (let i = 0; i < sorted.length && sample.length < n; i += step) {
    sample.push(sorted[i]!);
  }
  return sample;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const storage = getStorage();
  if (storage.backend !== "supabase") throw new Error("need supabase");
  const course = await storage.getCourse(COURSE);
  if (!course) throw new Error("course missing");
  const gen = course.generated as { units?: GeneratedUnit[] } | undefined;
  const units = gen?.units ?? [];
  console.log(
    JSON.stringify({
      backend: storage.backend,
      status: course.status,
      units: units.length,
    }),
  );
  if (units.length < 200) {
    throw new Error(`expected ~280 units, got ${units.length}`);
  }

  let ledger: CostLedger = refreshLedger({
    ...emptyLedger(),
    usdEstimate: 12.7,
    eurEstimate: 11.83,
  });

  const openaiKey = process.env.OPENAI_API_KEY!.trim();
  const items = flatten(units);
  console.log("rejudge questions", items.length);
  const judged = await liveJudgeWithUsage(openaiKey, items);
  ledger = addOpenAIUsage(
    ledger,
    judged.usage.prompt_tokens,
    judged.usage.completion_tokens,
  );
  console.log(
    "judge",
    judged.questions.filter((q) => q.passed).length,
    "/",
    judged.questions.length,
    "eur",
    ledger.eurEstimate,
  );

  const failedIds = new Set(failingUnits(judged.questions));
  const publishable = units.filter((u) => !failedIds.has(u.id));
  const dropped = units.filter((u) => failedIds.has(u.id));
  console.log(
    "publishable",
    publishable.length,
    "dropped_no_regen",
    dropped.length,
  );
  console.log(
    "credit_blocker: Anthropic Console balance too low for regen Batch — skipped",
  );

  const sample = pickSafetySample(publishable, 0.1);
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(
    join(OUT, `${runId}-safety-sample.json`),
    JSON.stringify(
      {
        note: "10% Stichprobe safety für Sinan vor Live. Regen blocked by Console credits.",
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
  writeFileSync(
    join(ROOT, "docs", "ops", "AP15-SAFETY-SAMPLE.md"),
    `# AP-15 Safety-Stichprobe (10 %)

**Für:** Sinan-Review vor Live von \`safetyFlag\`-Einheiten  
**Lauf:** ${runId}  
**Kurs:** \`${COURSE}\`  
**Stichprobe:** ${sample.length} von ${publishable.filter((u) => u.safetyFlag).length} Safety-Einheiten  

**Hinweis:** Console API-Guthaben war für die einmalige Nachbesserung verworfener Einheiten zu niedrig — verworfene Units wurden **nicht** regeneriert und bleiben unveröffentlicht.

Vollständige JSON: \`docs/ops/ap15-runs/${runId}-safety-sample.json\`

| ID | Modul | Block | Titel |
| --- | --- | --- | --- |
${sample.map((u) => `| ${u.id} | ${u.moduleId} | ${u.blockId} | ${u.title} |`).join("\n")}
`,
  );

  const lernfeld = mergePhaseLernfeld(publishable);
  await storage.setGenerated(COURSE, lernfeld);

  const passEvals = judged.questions.filter((q) =>
    publishable.some((u) => u.id === q.unitId),
  );
  const scores = aggregateScores(passEvals);
  const passed =
    publishable.length > 0 &&
    passEvals.length > 0 &&
    passEvals.every((q) => scoresPass(q.scores));

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
    warning: `Regen skipped: Anthropic Console credit balance too low. Dropped ${dropped.length} units after judge. Console API only (not Claude Max subscription).`,
  };

  const tid = await recordEvaluationTrace({
    name: "ap15-phase-a",
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
      unitsPublished: publishable.length,
      unitsDropped: dropped.length,
      costEur: ledger.eurEstimate,
      creditBlocker: "anthropic_console_balance_too_low_on_regen",
      apiPath: "console_batch_with_workspace_header",
    },
  });
  if (tid) (evaluation as { langfuseTraceId?: string }).langfuseTraceId = tid;
  await storage.setEvaluation(COURSE, evaluation);

  let published = false;
  if (passed && !ledger.stopped) {
    await storage.setStatus(COURSE, "published");
    published = true;
  }

  writeFileSync(
    join(ROOT, "src", "lib", "learner", "phase-a-published.json"),
    JSON.stringify(
      {
        courseId: COURSE,
        keyword: "Maschinen- und Anlagenführer",
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

  const byModule = Object.fromEntries(
    ["M0", "LF1", "LF2", "PA"].map((m) => [
      m,
      publishable.filter((u) => u.moduleId === m).length,
    ]),
  );
  const report = {
    courseId: COURSE,
    published,
    unitCount: publishable.length,
    droppedCount: dropped.length,
    droppedUnitIds: dropped.map((u) => u.id),
    byModule,
    ledger: refreshLedger(ledger),
    langfuseTraceId: tid,
    safetySample: sample.map((u) => u.id),
    creditBlocker:
      "Anthropic Console: credit balance too low for regen Batch (Messages/Batch bill Console, not Claude Max)",
    batches: [
      "msgbatch_01U7QY6f9Jdi8P6DWx3pHV4H",
      "msgbatch_011tGyteLAuCp1gwLDCsF3ts",
    ],
  };
  writeFileSync(join(OUT, `${runId}-report.json`), JSON.stringify(report, null, 2));
  writeFileSync(
    join(ROOT, "docs", "ops", "AP15-PHASE-A.md"),
    `# AP-15 Phase A Run

**Linear:** [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193)  
**Kurs:** \`${COURSE}\`  
**API:** Anthropic **Console** Batch (\`anthropic-workspace-id\`) — nicht Claude Max/Mac-Abo  
**Status:** ${published ? "published" : "not_published"}  
**Einheiten veröffentlicht:** ${publishable.length} / 280 Ziel  
**Verworfen (Judge, ohne Regen):** ${dropped.length}  
**Kosten (Schätzung):** ~€${ledger.eurEstimate} (Deckel €20)  
**Module:** M0=${byModule.M0}, LF1=${byModule.LF1}, LF2=${byModule.LF2}, PA=${byModule.PA}

## Credit-Blocker

Nach Generate+Judge: Regen-Batch → \`credit balance is too low\` (Console Plans & Billing).  
Verworfene Einheiten einmal neu erzeugen war geplant, ist aber ohne Console-Guthaben gestoppt.

## Artifacts

- \`docs/ops/ap15-runs/${runId}-*\`
- Safety: \`docs/ops/AP15-SAFETY-SAMPLE.md\`
- Learner: \`src/lib/learner/phase-a-published.json\`
`,
  );

  console.log(
    JSON.stringify(
      {
        published,
        units: publishable.length,
        dropped: dropped.length,
        eur: ledger.eurEstimate,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
