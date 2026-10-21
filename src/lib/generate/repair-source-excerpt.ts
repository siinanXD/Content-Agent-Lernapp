import { withSourceExcerpts, type SourceTextLoader } from "@/lib/quality/source-excerpt";
import type { GeneratedUnit } from "./maf-lernfeld-seed";
import type { RepairPlan } from "./repair-questions";

/**
 * Lädt Quellen-Auszüge nur für durchgefallene Fragen. Der Richter-Grund bleibt erhalten;
 * die Quelle wird nicht persistiert. Der optionale Loader macht den Pfad testbar.
 */
export async function repairPlanWithSourceExcerpts(
  unit: GeneratedUnit,
  plan: RepairPlan,
  load?: SourceTextLoader,
  env: Record<string, string | undefined> = process.env,
): Promise<RepairPlan> {
  if (plan.failed.length === 0) return plan;

  const sourceItems = plan.failed.map(({ question }) => ({
    sourceUrl: question.sourceUrl || unit.sourceUrl,
    prompt: question.prompt,
    correct: question.correct,
    explanation: question.explanation,
  }));
  const enriched = await withSourceExcerpts(sourceItems, load, env);

  return {
    ...plan,
    failed: plan.failed.map((failed, i) => ({
      ...failed,
      ...(enriched[i]?.sourceExcerpt ? { sourceExcerpt: enriched[i].sourceExcerpt.slice(0, 1200) } : {}),
    })),
  };
}
