"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { StatChip } from "@/components/ui/stat-chip";
import { Tile } from "@/components/ui/tile";
import { MobileShell } from "@/components/learner/mobile-shell";
import { DailyGoal } from "@/components/ui/daily-goal";
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

  // Kein Ergebnis gespeichert: keine Zahlen erfinden, sondern den Weg zur Einheit zeigen.
  const result = session?.lastResult;
  const areaResults = result?.areaResults ?? [];

  const headline = !result
    ? "Noch kein Ergebnis"
    : result.kind === "exam"
      ? "Prüfung ausgewertet"
      : result.kind === "review"
        ? "Wiederholung geschafft"
        : "Einheit geschafft";

  return (
    <MobileShell>
      <div className="px-6 pb-4 pt-12">
        <Tile tone="hero" className="gap-2">
          <p className="mono-label">Ergebnis</p>
          <h1
            className="text-[30px] font-bold leading-9"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {headline}
          </h1>
          <p className="text-[15px]">
            {result
              ? `${result.partTitle ? `${result.partTitle} · ` : ""}${result.unitTitle} · ${result.correct} von ${result.total} richtig`
              : "Schließe eine Einheit ab, dann siehst du hier dein Ergebnis."}
          </p>
        </Tile>
      </div>

      {summary === "fehler" ? (
        <StateView
          kind="fehler"
          title="Serie und Tagesziel nicht lesbar"
          text="Dein Ergebnis ist gespeichert. Lade die Seite neu, um Serie und Tagesziel zu sehen."
        />
      ) : null}

      {result ? (
        <section
          className="flex flex-wrap gap-2 px-6 py-4"
          aria-label="Deine Werte"
        >
          <StatChip
            kind="punkte"
            value={`+${result.points}`}
            label="Punkte heute"
            showLabel
          />
          {ready && ready.streak.days > 0 ? (
            <StatChip
              kind="serie"
              value={formatDays(ready.streak.days)}
              label="Serie"
              showLabel
            />
          ) : null}
          <StatChip
            kind="wiederholung"
            value={`${result.correct}/${result.total}`}
            label="richtig"
            showLabel
          />
        </section>
      ) : null}

      {ready ? (
        <div className="px-6 pb-4">
          <DailyGoal summary={ready} dueCount={0} />
        </div>
      ) : null}

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
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Morgen dran
          </p>
          <p
            className="mt-1 text-lg font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLAYABLE_TODAY.nextTitle}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Tagesziel: fällige Wiederholungen zuerst, dann neue Einheiten
          </p>
        </div>
        {showReminder ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
            <p
              className="text-[15px] font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Erinnerung um {reminder.time}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Eine Nachricht pro Tag, nur wenn du noch nicht gelernt hast
            </p>
          </div>
        ) : null}
        <Link href="/wiederholung" className="block">
          <Button variant="secondary">Zur Wiederholung</Button>
        </Link>
        <Link href="/einheit/unit-04" className="block">
          <Button>Weiter lernen</Button>
        </Link>
        <Link href="/lernpfad" className="block">
          <Button variant="secondary">Für heute fertig</Button>
        </Link>
      </section>
    </MobileShell>
  );
}
