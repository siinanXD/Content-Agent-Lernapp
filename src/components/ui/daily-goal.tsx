import { ProgressRing } from "@/components/ui/progress-ring";
import { dailyGoalCopy, type LearningSummary } from "@/lib/learner/streak";

/**
 * DailyGoal (Variante 2026, A1): Bento-Kachel mit Tagesziel-Ring, Titel und einem
 * ruhigen Satz. Zustände aus Screen 24: neuer Tag, übererfüllt, Serie gerissen.
 * Kein Druck, keine Strafe für Pausen. Der Ring füllt sich kurz (≤ 300 ms).
 */
export function DailyGoal({
  summary,
  dueCount,
  className = "",
}: {
  summary: LearningSummary;
  dueCount: number;
  className?: string;
}) {
  const { goal } = summary;
  const copy = dailyGoalCopy(summary, dueCount);
  return (
    <section aria-label="Tagesziel" className={`bento-tile ${className}`}>
      <p className="bento-label">Tagesziel</p>
      <div className="flex items-center gap-4">
        <ProgressRing done={goal.done} total={goal.goal} showLabel={false} label="heute" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2
            className="text-[17px] font-semibold leading-[22px] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {copy.title}
          </h2>
          <p className="text-[13px] leading-[17px] text-[var(--color-text-secondary)]">
            {copy.text}
          </p>
        </div>
      </div>
    </section>
  );
}
