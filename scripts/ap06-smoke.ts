/**
 * Live AP-06 smoke: OpenAI judge + Langfuse trace + publish gate.
 * Never prints secret values.
 */
import { mafSeedLernfeldSicherheit } from "../src/lib/generate/maf-lernfeld-seed";
import {
  handleEvaluate,
  handlePublish,
} from "../src/lib/pipeline/mock-handlers";
import {
  createCourse,
  setEvaluation,
  setGenerated,
} from "../src/lib/pipeline/mock-store";
import { LANGFUSE_DATASET_NAME, MAF_GOLDSET_ITEMS } from "../src/lib/quality/maf-goldset";
import {
  ensureGoldsetDataset,
  fetchGoldsetFromLangfuse,
  langfuseConfigured,
} from "../src/lib/quality/langfuse-client";

type Json = Record<string, unknown>;

async function readJson(res: Response): Promise<{ status: number; body: Json }> {
  return { status: res.status, body: (await res.json()) as Json };
}

async function main() {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const langfuse = langfuseConfigured();
  if (!openai) {
    throw new Error("OPENAI_API_KEY required for live smoke");
  }
  if (!langfuse) {
    throw new Error("LANGFUSE_* required for live smoke");
  }

  let remote = await fetchGoldsetFromLangfuse();
  let langfuseItems = remote?.length ?? 0;
  let synced: number | null = null;
  if (langfuseItems < 70) {
    const uploaded = await ensureGoldsetDataset(MAF_GOLDSET_ITEMS);
    synced = uploaded?.upserted ?? null;
    remote = await fetchGoldsetFromLangfuse();
    langfuseItems = remote?.length ?? synced ?? 0;
  }

  const missing = createCourse("MAF smoke 409");
  const r409 = await readJson(handlePublish(missing.id));

  const below = createCourse("MAF smoke 422");
  setEvaluation(below.id, {
    passed: false,
    scores: {
      sourceFidelity: 0,
      uniqueness: 1,
      niveau: 2,
      language: 2,
      safetyFlag: false,
    },
    questions: [{ passed: false }],
  });
  const r422 = await readJson(handlePublish(below.id));

  const passCourse = createCourse("MAF smoke 200");
  setGenerated(passCourse.id, mafSeedLernfeldSicherheit());
  setEvaluation(passCourse.id, {
    passed: true,
    scores: {
      sourceFidelity: 1,
      uniqueness: 1,
      niveau: 4,
      language: 5,
      safetyFlag: true,
    },
    questions: [{ passed: true }],
  });
  const r200 = await readJson(handlePublish(passCourse.id));

  const live = createCourse("Maschinen- und Anlagenführer");
  setGenerated(live.id, mafSeedLernfeldSicherheit());
  const evaluated = await readJson(await handleEvaluate(live.id));
  const published = await readJson(handlePublish(live.id));

  const report = {
    openai: true,
    langfuse: true,
    dataset: LANGFUSE_DATASET_NAME,
    langfuseItemCount: langfuseItems,
    langfuseSynced: synced,
    publishWithoutEvaluate: {
      status: r409.status,
      error: r409.body.error ?? null,
    },
    publishBelowThreshold: {
      status: r422.status,
      reason: r422.body.reason ?? null,
    },
    publishWhenPassed: {
      status: r200.status,
      blocked: r200.body.blocked ?? null,
      publishedUnits: r200.body.publishedUnits ?? null,
    },
    liveEvaluate: {
      status: evaluated.status,
      mode: evaluated.body.mode ?? null,
      passed: evaluated.body.passed ?? null,
      modelId: evaluated.body.modelId ?? null,
      langfuseTraceId: evaluated.body.langfuseTraceId ? "present" : "missing",
      questionCount: Array.isArray(evaluated.body.questions)
        ? evaluated.body.questions.length
        : 0,
      scores: evaluated.body.scores ?? null,
      warning: evaluated.body.warning ?? null,
    },
    livePublish: {
      status: published.status,
      blocked: published.body.blocked ?? null,
      publishedUnits: published.body.publishedUnits ?? null,
      reason: published.body.reason ?? null,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  const failures: string[] = [];
  if (r409.status !== 409) failures.push(`expected 409, got ${r409.status}`);
  if (r422.status !== 422) failures.push(`expected 422, got ${r422.status}`);
  if (r200.status !== 200) failures.push(`expected 200, got ${r200.status}`);
  if (evaluated.status !== 200) failures.push(`evaluate ${evaluated.status}`);
  if (evaluated.body.mode !== "live") {
    failures.push(`expected mode=live, got ${String(evaluated.body.mode)}`);
  }
  if (!evaluated.body.langfuseTraceId) failures.push("missing langfuseTraceId");
  if (langfuseItems < 70) {
    failures.push(`Langfuse dataset items ${langfuseItems} < 70`);
  }
  if (published.status !== 200 && published.status !== 422) {
    failures.push(`live publish expected 200 or 422, got ${published.status}`);
  }
  if (failures.length) {
    throw new Error(failures.join("; "));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
