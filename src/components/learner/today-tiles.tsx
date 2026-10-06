import Link from "next/link";
import { RepeatIcon } from "@/components/ui/icons";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  dailyGoalCopy,
  formatDays,
  type LearningSummary,
  type WeekDot,
} from "@/lib/learner/streak";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Kachel „Tagesziel“ (Figma 52:377): Ring, Titel und ein ruhiger Satz. Kein Druck, keine Strafe für Pausen. */
export function GoalTile({
  summary,
  dueCount,
}: {
  summary: LearningSummary;
  dueCount: number;
}) {
  const copy = dailyGoalCopy(summary, dueCount);
  return (
    <section
      aria-label="Tagesziel"
      className="flex flex-col gap-2 rounded-[20px] bg-[var(--color-bg-surface)] p-4"
    >
      <p className="mono-label text-[var(--color-text-secondary)]" aria-hidden="true">
        Tagesziel
      </p>
      <ProgressRing
        done={summary.goal.done}
        total={summary.goal.goal}
        label="heute"
        showLabel={false}
        size={84}
      />
      <h2
        className="text-[15px] font-semibold leading-[1.3] text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {copy.title}
      </h2>
      <p className="text-xs leading-[1.3] text-[var(--color-text-secondary)]">{copy.text}</p>
    </section>
  );
}

/** Kachel „Serie“ mit den sieben Wochenpunkten (Figma 52:377). Zahlen kommen aus echten Lernereignissen. */
export function StreakTile({ summary, week }: { summary: LearningSummary; week: WeekDot[] }) {
  const { days } = summary.streak;
  return (
    <section
      aria-label="Serie"
      data-kind="serie"
      className="flex flex-col gap-2 rounded-[20px] bg-[var(--color-bg-hint)] p-4 text-[var(--color-text-hint)]"
    >
      <span className="sr-only">{formatDays(days)} Serie</span>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <p className="mono-label">Serie</p>
        <p
          className="text-[44px] font-bold leading-[1.1]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {days}
        </p>
        <p className="text-[13px] font-medium leading-[1.3]">
          {days === 1 ? "Tag am Stück" : "Tage am Stück"}
        </p>
      </div>
      <ol className="mt-auto flex gap-1" aria-label="Diese Woche">
        {week.map((d) => (
          <li key={d.label} className="flex">
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{
                background: d.learned
                  ? "var(--color-brand-primary)"
                  : d.today
                    ? "var(--color-accent-on-dark)"
                    : "var(--color-week-dot-idle)",
              }}
            />
            <span className="sr-only">
              {d.label}
              {d.today ? " (heute)" : ""}:{" "}
              {d.learned ? "gelernt" : d.future || d.today ? "noch offen" : "nicht gelernt"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Kachel „Wiederholung“ (Figma 52:377): ein Link, die einzige Aktion der Kachel. */
export function ReviewTile({ dueCount }: { dueCount: number }) {
  return (
    <Link
      href="/wiederholung"
      className={`flex min-h-[78px] items-center gap-3 rounded-[20px] bg-[var(--color-bg-surface)] p-4 ${focus}`}
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-hint)] text-[var(--color-brand-primary)]"
      >
        <RepeatIcon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="text-[15px] font-semibold leading-[1.3] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {dueCount > 0
            ? `${dueCount} ${dueCount === 1 ? "Frage" : "Fragen"} wiederholen`
            : "Wiederholung"}
        </span>
        <span className="text-xs leading-[1.3] text-[var(--color-text-secondary)]">
          {dueCount > 0
            ? "Heute fällig"
            : "Nichts fällig. Fragen kommen nach deinen Einheiten."}
        </span>
      </span>
      <span aria-hidden="true" className="text-lg font-semibold text-[var(--color-text-secondary)]">
        →
      </span>
    </Link>
  );
}

export type ReadinessRow = { id: string; pct: number };

/** Kachel „Prüfungsreife“ je Lernfeld (Figma 52:377): Anteil geschaffter Einheiten, nichts erfunden. */
export function ReadinessTile({ rows }: { rows: ReadinessRow[] }) {
  return (
    <section
      aria-labelledby="reife-title"
      className="flex flex-col gap-2.5 rounded-[20px] bg-[var(--color-bg-surface)] p-4"
    >
      <h2
        id="reife-title"
        className="text-[15px] font-semibold leading-[1.3] text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Prüfungsreife
      </h2>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.id} className="mono-label flex items-center gap-2.5">
            <span className="w-8 shrink-0 text-[var(--color-text-secondary)]">{r.id}</span>
            <div
              role="progressbar"
              aria-label={`${r.id} Prüfungsreife`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={r.pct}
              className="h-2 flex-1 overflow-hidden rounded bg-[var(--color-border-subtle)]"
            >
              <div
                className="fill-motion h-full rounded"
                style={{
                  width: `${r.pct}%`,
                  background:
                    r.pct >= 50 ? "var(--color-brand-primary)" : "var(--color-brand-accent)",
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-[var(--color-text-primary)]">
              {r.pct} %
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
