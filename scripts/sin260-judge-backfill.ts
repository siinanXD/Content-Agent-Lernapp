/**
 * SIN-260 — Bewertungslauf über alle bestehenden Fragen.
 *
 * Bewertet nur neue oder geänderte Fragen (Inhalts-Hash), schreibt je Frage in question_evaluations
 * und je Lauf einen Ledger-Eintrag in judge_runs. Deckel: 19 € je Lauf (hart 20 €).
 *
 * Usage:
 *   COURSE_STORAGE=supabase npm run quality:judge-backfill
 *   COURSE_STORAGE=supabase npm run quality:judge-backfill -- --dry-run
 */
import { loadMafCurriculum } from "../src/lib/content/curriculum";
import type { GeneratedUnit } from "../src/lib/generate/maf-lernfeld-seed";
import { liveJudgeWithUsage } from "../src/lib/quality/evaluate-agent";
import {
  BACKFILL_STOP_EUR,
  planBackfill,
  runJudgeBackfill,
  unitsToEvalItems,
} from "../src/lib/quality/judge-backfill";
import { recordEvaluationTrace } from "../src/lib/quality/langfuse-client";
import { recordRunCost } from "../src/lib/quality/run-ledger";
import { getStorage } from "../src/lib/storage";

async function main() {
  const dry = process.argv.includes("--dry-run");
  const storage = getStorage();
  if (storage.backend !== "supabase") {
    console.error("STOP: need COURSE_STORAGE=supabase (got", storage.backend, ")");
    process.exit(2);
  }
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key && !dry) {
    console.error("STOP: OPENAI_API_KEY fehlt (nur --dry-run ohne Key)");
    process.exit(2);
  }

  const curriculum = loadMafCurriculum();
  const yearOf = (id: string | undefined) => curriculum.modules.find((m) => m.id === id)?.year;
  const courses = (await storage.listCourses()).filter((c) => !c.mock);
  const baseRunId = `backfill-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const summary: Array<Record<string, unknown>> = [];
  let spentEur = 0;

  for (const course of courses) {
    const units = (course.generated as { units?: GeneratedUnit[] } | undefined)?.units ?? [];
    const items = unitsToEvalItems(units, yearOf);
    if (items.length === 0) continue;
    if (dry) {
      const { pending, skipped } = planBackfill(items, await storage.listQuestionEvaluations(course.id));
      summary.push({ course: course.id, total: items.length, pending: pending.length, skipped });
      continue;
    }
    // Deckel gilt für den ganzen Lauf, nicht je Kurs.
    const stopEur = BACKFILL_STOP_EUR - spentEur;
    if (stopEur <= 0) {
      summary.push({ course: course.id, total: items.length, stopped: "Kostendeckel" });
      continue;
    }
    const r = await runJudgeBackfill({
      storage,
      courseId: course.id,
      items,
      stopEur,
      runId: `${baseRunId}-${course.id.slice(0, 8)}`,
      // Nur Kennungen und Zahlen nach Langfuse, keine Fragetexte (SIN-270).
      report: {
        question: async (q, ctx) => {
          await recordEvaluationTrace({
            name: "judge-backfill-question",
            courseId: ctx.courseId,
            passed: q.passed,
            scores: { ...q.scores },
            metadata: { kind: "question-eval", runId: ctx.runId, unitId: q.unitId, questionId: q.questionId },
          });
        },
        run: async (s) => {
          await recordRunCost({ runId: s.runId, courseId: course.id, kind: "judge-backfill", ledger: s.ledger });
        },
      },
      judge: (chunk) => liveJudgeWithUsage(key!, chunk),
    });
    spentEur += r.ledger.eurEstimate;
    summary.push({
      course: course.id,
      total: r.total,
      skipped: r.skipped,
      judged: r.judged,
      passed: r.passed,
      failed: r.failed,
      remaining: r.remaining,
      eur: r.ledger.eurEstimate,
    });
  }

  console.log(JSON.stringify({ dry, spentEur: Math.round(spentEur * 100) / 100, courses: summary }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
