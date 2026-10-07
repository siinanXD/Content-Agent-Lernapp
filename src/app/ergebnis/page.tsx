"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatChip } from "@/components/ui/stat-chip";
import { MobileShell } from "@/components/learner/mobile-shell";
import { DailyGoal } from "@/components/ui/daily-goal";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  DEFAULT_REMINDER,
  loadOnboarding,
  loadReminder,
} from "@/lib/learner/onboarding";
import { PLAYABLE_TODAY } from "@/lib/learner/playable-path";
import { loadSession } from "@/lib/learner/session";
import {
  formatDays,
  loadLearningSummary,
  type LearningSummary,
} from "@/lib/learner/streak";
import { useAfterMount } from "@/lib/use-after-mount";
import type { TrafficLight } from "@/lib/content/didaktik";

const lightClass: Record<TrafficLight, string> = {
  green: "bg-[var(--color-feedback-success)] text-white",
  yellow: "bg-[var(--color-brand-accent)] text-[var(--color-text-primary)]",
  red: "bg-[var(--color-feedback-danger)] text-white",
};

export default function ErgebnisPage() {
  const session = useAfterMount(loadSession, null);
  const summary = useAfterMount<LearningSummary | "laden" | "fehler">(
    loadLearningSummary,
    "laden",
  );
  const onboarding = useAfterMount(loadOnboarding, null);
  const reminder = useAfterMount(loadReminder, DEFAULT_REMINDER);
  // Erinnerungen gibt es nur mit Einwilligung (SIN-279).
  const showReminder = onboarding?.consent === true && reminder.enabled;
  const ready = summary !== "laden" && summary !== "fehler" ? summary : null;

  const result = session?.lastResult;
  const title = result?.unitTitle;
  const correct = result?.correct ?? 0;
  const total = result?.total ?? 0;
  const points = result?.points;
  const kind = result?.kind ?? "unit";
  const areaResults = result?.areaResults ?? [];

  const headline =
    kind === "exam"
      ? "Prüfung ausgewertet"
      : kind === "review"
        ? "Wiederholung geschafft"
        : "Einheit geschafft";

  return (
    <MobileShell>
      <div className="bento px-6 pb-4 pt-12">
        <section
          aria-label="Ergebnis"
          className="bento-tile bento-main bento-span-6"
        >
          <p className="bento-label">Ergebnis</p>
          <div className="flex items-center gap-5">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h1
                className="text-[28px] font-bold leading-9 text-[var(--color-text-on-brand)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {headline}
              </h1>
              {result ? (
                <p className="text-[15px] leading-6 text-[var(--color-text-soft-on-dark)]">
                  {result.partTitle ? `${result.partTitle} · ` : ""}
                  {title} · {correct} von {total} richtig
                </p>
              ) : null}
            </div>
            {result && total > 0 ? (
              <ProgressRing
                done={correct}
                total={total}
                label="richtig"
                name="Ergebnis"
                onDark
                showLabel={false}
              />
            ) : null}
          </div>
          <Link
            href="/einheit/unit-04"
            className="mt-2 flex min-h-[50px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-4 text-base font-semibold text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
          >
            Weiter lernen
          </Link>
        </section>

        {result ? (
          <section
            className="bento-tile bento-span-3"
            aria-label="Deine Werte"
          >
            <p className="bento-label">Heute</p>
            <div className="flex flex-wrap gap-2">
              {points !== undefined ? (
                <StatChip
                  kind="punkte"
                  value={`+${points}`}
                  label="Punkte heute"
                  showLabel
                />
              ) : null}
              {ready && ready.streak.days > 0 ? (
                <StatChip
                  kind="serie"
                  value={formatDays(ready.streak.days)}
                  label="Serie"
                  showLabel
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {ready ? (
          <DailyGoal
            summary={ready}
            dueCount={0}
            className={result ? "bento-span-3" : "bento-span-6"}
          />
        ) : null}
      </div>

      {areaResults.length > 0 ? (
        <section className="px-6 pb-4" aria-label="Ergebnis je Prüfungsgebiet">
          <h2
            className="mb-3 text-lg font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ampel je Gebiet
          </h2>
          <ul className="flex flex-col gap-2">
            {areaResults.map((a) => (
              <li
                key={a.areaId}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {a.title}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {a.correct}/{a.total} · {Math.round(a.ratio * 100)}%
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium ${lightClass[a.light]}`}
                >
                  {a.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
            Unter 60 % (rot): zugehörige Einheiten im Lernpfad wiederholen. Keine
            KI-Note für offene Aufgaben.
          </p>
        </section>
      ) : null}

      <section className="flex flex-1 flex-col gap-3 px-6 pb-8">
        <section aria-label="Morgen dran" className="bento-tile">
          <p className="bento-label">Morgen dran</p>
          <p
            className="text-lg font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLAYABLE_TODAY.nextTitle}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Tagesziel: fällige Wiederholungen zuerst, dann neue Einheiten
          </p>
        </section>
        {showReminder ? (
          <section aria-label="Erinnerung" className="bento-tile">
            <p className="bento-label">Erinnerung</p>
            <p
              className="text-[15px] font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Um {reminder.time}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Eine Nachricht pro Tag, nur wenn du noch nicht gelernt hast
            </p>
          </section>
        ) : null}
        <Link href="/wiederholung" className="block">
          <Button variant="secondary">Zur Wiederholung</Button>
        </Link>
        <Link href="/lernpfad" className="block">
          <Button variant="secondary">Für heute fertig</Button>
        </Link>
      </section>
    </MobileShell>
  );
}
