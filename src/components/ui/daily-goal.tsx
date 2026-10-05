import { Progress } from "@/components/ui/progress";

/** DailyGoal (Figma 19:280): Heutiges Ziel mit Fortschritt. */
export function DailyGoal({
  goal,
  done,
  total,
  hint,
}: {
  goal: string;
  done: number;
  total: number;
  hint?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
      <p className="text-sm text-[var(--color-text-secondary)]">Heutiges Ziel</p>
      <p
        className="mt-1 text-base font-medium text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {goal}
      </p>
      <div className="mt-3">
        <Progress value={pct} label="Tagesziel" />
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        {done} von {total} erledigt{hint ? ` · ${hint}` : ""}
      </p>
    </div>
  );
}
