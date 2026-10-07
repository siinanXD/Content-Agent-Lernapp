"use client";

import { useA11y } from "@/components/a11y/a11y-provider";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { StateView } from "@/components/ui/state-view";
import { ToggleRow } from "@/components/ui/toggle-row";
import { Bento, Tile } from "@/components/ui/tile";
import { loadSession } from "@/lib/learner/session";
import { loadStack, stackSize, type LeitnerStack } from "@/lib/learner/leitner";
import {
  DAILY_GOAL,
  countLearningDays,
  formatDays,
  loadLearningEvents,
  loadLearningSummary,
  weekActivity,
  type LearningEvent,
  type LearningSummary,
} from "@/lib/learner/streak";
import { useAfterMount } from "@/lib/use-after-mount";

const NO_EVENTS: LearningEvent[] = [];

const rowLink =
  "flex min-h-11 items-center justify-between gap-3 text-[15px] text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Screen W9 Profil (Variante 2026): Bento aus Fortschritt, Serie, Wochen-Säulen und Einstellungen-Liste. */
export default function ProfilPage() {
  const session = useAfterMount(loadSession, null);
  const stack = useAfterMount<LeitnerStack | null>(loadStack, null);
  const events = useAfterMount<LearningEvent[]>(loadLearningEvents, NO_EVENTS);
  const reviewSize = stack ? stackSize(stack) : 0;
  const summary = useAfterMount<LearningSummary | "laden" | "fehler">(
    loadLearningSummary,
    "laden",
  );
  const { prefs, setPrefs } = useA11y();

  if (summary === "fehler") {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Profil</h1>
          <StateView
            kind="fehler"
            title="Dein Lernstand ist nicht lesbar"
            text="Der Speicher dieses Geräts antwortet nicht. Deine Daten bleiben unverändert."
          >
            <Link
              href="/einstellungen"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-medium text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Zu den Einstellungen
            </Link>
          </StateView>
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  const streak =
    summary === "laden"
      ? { days: 0, learnedToday: false, previousDays: 0 }
      : summary.streak;

  const daysDone = countLearningDays(events);
  const daysTotal = session?.variant === "weiterbildung" ? 60 : 40;
  const pct = Math.min(100, Math.round((daysDone / daysTotal) * 100));
  const variantLabel =
    session?.variant === "weiterbildung"
      ? "Weiterbildung · 3 Monate"
      : "Prüfungsvorbereitung · 2 Monate";
  const week = weekActivity(events);
  const weekMax = Math.max(DAILY_GOAL, ...week.map((d) => d.count));
  const weekdayFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" });
  const areaResults = session?.lastResult?.areaResults ?? [];

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-[var(--bento-gap)] px-6 pb-6 pt-12">
        <Bento>
          <Tile tone="hero" aria-labelledby="profil-titel">
            <p className="mono-label text-[var(--color-text-muted-on-dark)]">
              {session?.keyword ?? "Maschinen- und Anlagenführer"} · {variantLabel}
            </p>
            <h1
              id="profil-titel"
              className="text-[28px] font-bold leading-9"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Profil
            </h1>
            <p className="text-[15px] text-[var(--color-text-soft-on-dark)]">
              {daysDone} von {daysTotal} Lerntagen · {pct} % des Plans
            </p>
            <Progress value={pct} label="Fortschritt bis zur Prüfung" />
          </Tile>

          <div className="grid grid-cols-2 gap-[var(--bento-gap)] md:gap-[var(--bento-gap-wide)]">
            <Tile as="div">
              <p className="mono-label text-[var(--color-text-secondary)]">Serie</p>
              <p
                className="text-[28px] font-bold leading-9 text-[var(--color-brand-primary)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {formatDays(streak.days)}
              </p>
              {streak.previousDays > 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Letzte Serie
                  <br />
                  <span className="text-[var(--color-text-primary)]">
                    {formatDays(streak.previousDays)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">am Stück</p>
              )}
            </Tile>
            <Tile as="div">
              <p className="mono-label text-[var(--color-text-secondary)]">Stapel</p>
              <p
                className="text-[28px] font-bold leading-9"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {reviewSize}
              </p>
              <Link
                href="/wiederholung"
                className="inline-flex min-h-11 items-center text-sm text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                Zur Wiederholung
              </Link>
            </Tile>
          </div>

          <Tile aria-labelledby="woche-titel">
            <h2
              id="woche-titel"
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Diese Woche
            </h2>
            <ul className="flex h-28 items-end justify-between gap-2">
              {week.map((d) => {
                const label = weekdayFmt.format(new Date(`${d.day}T12:00:00Z`));
                return (
                  <li
                    key={d.day}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    aria-label={`${label}: ${d.count} ${d.count === 1 ? "Einheit" : "Einheiten"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grow-bar block w-full max-w-8 rounded-[var(--radius-sm)] ${
                        d.count > 0
                          ? "bg-[var(--color-brand-primary)]"
                          : "bg-[var(--color-border-subtle)]"
                      }`}
                      style={{ height: `${Math.max(4, (d.count / weekMax) * 72)}px` }}
                    />
                    <span
                      aria-hidden="true"
                      className={`mono-label ${d.today ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}
                    >
                      {label.replace(".", "")}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Einheiten pro Tag, Tagesziel {DAILY_GOAL}.
            </p>
          </Tile>

          {session?.totalPoints != null || areaResults.length > 0 ? (
            <Tile aria-labelledby="stand-titel">
              <h2
                id="stand-titel"
                className="text-base font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Stand
              </h2>
              {session?.totalPoints != null ? (
                <p className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span>Punkte gesamt</span>
                  <span className="mono-label">
                    {session.totalPoints.toLocaleString("de-DE")}
                  </span>
                </p>
              ) : null}
              {areaResults.length > 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Letzte Probeprüfung (Übung):{" "}
                  {areaResults.map((a) => `${a.areaId}: ${a.label}`).join(" · ")}
                </p>
              ) : null}
            </Tile>
          ) : null}

          <Tile aria-labelledby="einstellungen-titel">
            <h2
              id="einstellungen-titel"
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Einstellungen
            </h2>
            <ToggleRow
              id="simple-language"
              label="Einfache Sprache"
              checked={prefs.simpleLanguage}
              onChange={(checked) => setPrefs({ ...prefs, simpleLanguage: checked })}
            />
            <ToggleRow
              id="read-aloud"
              label="Vorlesen"
              checked={prefs.readAloud}
              onChange={(checked) => setPrefs({ ...prefs, readAloud: checked })}
            />
            <Link href="/einstellungen" className={rowLink}>
              <span>Datennutzung, Erinnerung und Daten</span>
              <span aria-hidden="true">›</span>
            </Link>
          </Tile>
        </Bento>
      </main>
      <BottomNav />
    </MobileShell>
  );
}
