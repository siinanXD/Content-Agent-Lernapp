"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { MobileShell } from "@/components/learner/mobile-shell";
import { BottomNav } from "@/components/learner/bottom-nav";
import {
  EXAM_PASS_RATIO,
  examPassed,
  examPercent,
  weakestAreas,
} from "@/lib/learner/exam-result";
import { loadSession } from "@/lib/learner/session";
import { useAfterMount } from "@/lib/use-after-mount";

const SIZE = 92;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const linkButton =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] px-5 py-3.5 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Screen 21 Prüfung · Ergebnis: Ring, Übungsgrenze 50 %, Auswertung nach Lernfeld, falsche Fragen in der Wiederholung. */
export default function PruefungErgebnisPage() {
  const session = useAfterMount(loadSession, null);
  const [open, setOpen] = useState(false);
  const listId = useId();

  const result = session?.lastResult;
  if (!result || result.kind !== "exam") {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Prüfung · Ergebnis</h1>
          <StateView
            kind="leer"
            title="Noch keine Prüfung abgeschlossen"
            text="Das Ergebnis erscheint, sobald du eine Probeprüfung beendet hast."
          >
            <Link
              href="/pruefung"
              className={`${linkButton} bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)]`}
            >
              Zum Prüfungsmodus
            </Link>
          </StateView>
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  const percent = examPercent(result.correct, result.total);
  const passed = examPassed(result.correct, result.total);
  const areas = result.areaResults ?? [];
  const wrong = result.wrongAnswers ?? [];
  const weak = weakestAreas(areas);

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col">
        <header className="flex flex-col gap-2.5 bg-[var(--color-bg-hero)] px-5 pb-6 pt-10">
          <p
            className="text-xs font-medium leading-4 text-[var(--color-text-muted-on-dark)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Probeprüfung · {result.unitTitle} · {result.total} Fragen
          </p>
          <div className="flex items-center gap-4">
            <div
              className="relative shrink-0"
              style={{ width: SIZE, height: SIZE }}
              role="img"
              aria-label={`${percent} Prozent richtig, ${result.correct} von ${result.total}`}
            >
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="-rotate-90"
                aria-hidden="true"
                focusable="false"
              >
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="var(--color-track-on-dark)"
                  strokeWidth={STROKE}
                />
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="var(--color-brand-accent)"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
                />
              </svg>
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-[22px] font-bold text-[var(--color-text-on-brand)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {percent} %
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1
                className="text-xl font-bold leading-[26px] text-[var(--color-text-on-brand)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {passed ? "Über" : "Unter"} der Bestehensgrenze
              </h1>
              <p className="text-[13px] leading-[17px] text-[var(--color-text-soft-on-dark)]">
                Grenze {Math.round(EXAM_PASS_RATIO * 100)} %. Das ist eine
                Übungsprüfung, keine Prognose der IHK.
              </p>
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-3 px-5 pb-6 pt-[18px]">
          {areas.length > 0 ? (
            <section aria-labelledby="lernfeld-titel" className="flex flex-col gap-3">
              <h2
                id="lernfeld-titel"
                className="text-[17px] font-semibold leading-[22px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Nach Lernfeld
              </h2>
              <ul className="flex flex-col gap-3">
                {areas.map((a) => {
                  const pct = Math.round(a.ratio * 100);
                  const red = a.light === "red";
                  return (
                    <li key={a.areaId} className="flex flex-col gap-[5px]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium leading-[18px]">{a.title}</span>
                        <span
                          className={`text-[13px] font-medium leading-[17px] ${red ? "text-[var(--color-feedback-danger)]" : "text-[var(--color-text-secondary)]"}`}
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {pct} %
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={a.title}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                        className="h-1.5 w-full overflow-hidden rounded-[3px] bg-[var(--color-border-subtle)]"
                      >
                        <div
                          className={`h-full rounded-[3px] ${red ? "bg-[var(--color-feedback-danger)]" : "bg-[var(--color-brand-primary)]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section
            aria-labelledby="schritt-titel"
            className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4"
          >
            <h2
              id="schritt-titel"
              className="text-base font-semibold leading-[21px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {wrong.length === 0
                ? "Alle Fragen richtig"
                : wrong.length === 1
                  ? "1 Frage kommt in deine Wiederholung"
                  : `${wrong.length} Fragen kommen in deine Wiederholung`}
            </h2>
            <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
              {wrong.length === 0
                ? "Es gibt nichts zu wiederholen. Mach morgen mit dem Lernpfad weiter."
                : `${weak.length > 0 ? `Vor allem ${weak.map((a) => a.title).join(" und ")}. ` : ""}${wrong.length === 1 ? "Sie erscheint" : "Sie erscheinen"} nach 1, 3 und 7 Tagen wieder.`}
            </p>
          </section>

          {wrong.length > 0 ? (
            <Link
              href="/wiederholung"
              className={`${linkButton} bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)] hover:opacity-95`}
            >
              Wiederholung starten
            </Link>
          ) : (
            <Link
              href="/lernpfad"
              className={`${linkButton} bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)] hover:opacity-95`}
            >
              Zum Lernpfad
            </Link>
          )}

          {wrong.length > 0 ? (
            <>
              <Button
                variant="secondary"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((o) => !o)}
                className="!text-[var(--color-brand-primary)] font-semibold"
              >
                Antworten durchgehen
              </Button>
              {open ? (
                <ol id={listId} className="flex flex-col gap-3">
                  {wrong.map((w) => (
                    <li
                      key={w.id}
                      className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4"
                    >
                      <p className="text-[15px] font-semibold leading-5">{w.prompt}</p>
                      <p className="text-sm leading-[18px]">
                        <span className="font-medium">Richtig: </span>
                        {w.answer}
                      </p>
                      {w.explanation ? (
                        <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
                          {w.explanation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </>
          ) : null}
        </div>
      </main>
      <BottomNav />
    </MobileShell>
  );
}
