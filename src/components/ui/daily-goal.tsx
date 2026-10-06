import { ProgressRing } from "@/components/ui/progress-ring";
import { dailyGoalCopy, type LearningSummary } from "@/lib/learner/streak";

/**
 * DailyGoal (Figma 19:280, Screen 22 „Tagesziel-Karte“): dunkle Karte mit Ring,
 * Titel und einem ruhigen Satz. Zustände aus Screen 24: neuer Tag, übererfüllt,
 * Serie gerissen. Kein Druck, keine Strafe für Pausen.
 */
export function DailyGoal({
  summary,
  dueCount,
}: {
  summary: LearningSummary;
  dueCount: number;
}) {
  const { goal } = summary;
  const copy = dailyGoalCopy(summary, dueCount);
  return (
    <section
      aria-label="Tagesziel"
      className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-hero)] p-4"
    >
      <ProgressRing done={goal.done} total={goal.goal} onDark showLabel={false} label="heute" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2
          className="text-[17px] font-semibold leading-[22px] text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {copy.title}
        </h2>
        <p className="text-[13px] leading-[17px] text-[var(--color-text-soft-on-dark)]">
          {copy.text}
        </p>
      </div>
    </section>
  );
}
