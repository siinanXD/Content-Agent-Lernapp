"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/learner/mobile-shell";
import { BottomNav } from "@/components/learner/bottom-nav";
import {
  QuestionPanel,
  type AnswerResult,
} from "@/components/learner/question-panel";
import {
  dueItems,
  loadStack,
  markCorrect,
  markWrong,
  saveStack,
  stackSize,
  type LeitnerStack,
} from "@/lib/learner/leitner";
import { fetchPhaseAPathUnits } from "@/lib/learner/phase-a-path";
import { getQuestionById } from "@/lib/learner/playable-path";
import {
  enqueueProgress,
  flushProgress,
} from "@/lib/learner/progress-outbox";
import {
  formatDueDate,
  mostMissedAreas,
  nextDueAt,
  stageRows,
} from "@/lib/learner/review-overview";
import { Bento, Tile } from "@/components/ui/tile";
import { Progress } from "@/components/ui/progress";
import { StateView } from "@/components/ui/state-view";
import { useOnline } from "@/lib/use-online";
import { loadSession, saveSession } from "@/lib/learner/session";
import { loadLearningSummary, recordLearningEvent } from "@/lib/learner/streak";
import { useAfterMount } from "@/lib/use-after-mount";

const linkButton =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] px-5 py-3.5 text-base font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Stapel, Plan 1 · 3 · 7 · 14 und Gebiete mit den meisten Fragen (Figma W6). */
function ReviewOverview({ stack }: { stack: LeitnerStack }) {
  const rows = stageRows(stack);
  const areas = mostMissedAreas(
    stack.items.map((i) => getQuestionById(i.questionId)?.examAreas ?? []),
  );
  return (
    <Bento>
      <div className="grid grid-cols-2 gap-[var(--bento-gap)] md:gap-[var(--bento-gap-wide)]">
        <Tile as="div">
          <p className="mono-label text-[var(--color-text-secondary)]">Stapel</p>
          <p
            className="text-[32px] font-bold leading-10"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {stackSize(stack)}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {stackSize(stack) === 1 ? "Frage" : "Fragen"}
          </p>
        </Tile>
        <Tile as="div">
          <p className="mono-label text-[var(--color-text-secondary)]">Plan</p>
          <p
            className="text-[22px] font-bold leading-8"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {rows.map((r) => r.days).join(" · ")}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">Tage Abstand</p>
        </Tile>
      </div>
      <Tile aria-labelledby="stufen-titel">
        <h2
          id="stufen-titel"
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Fragen je Stufe
        </h2>
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li
              key={r.stage}
              className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] last:border-b-0"
            >
              <span className="text-[15px]">
                Stufe {r.stage} · nach {r.days} {r.days === 1 ? "Tag" : "Tagen"}
              </span>
              <span className="mono-label text-[var(--color-text-primary)]">{r.count}</span>
            </li>
          ))}
        </ul>
      </Tile>
      {areas.length > 0 ? (
        <Tile aria-labelledby="gebiete-titel">
          <h2
            id="gebiete-titel"
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Meiste Fehler
          </h2>
          <ul className="flex flex-col gap-2">
            {areas.map((a) => (
              <li key={a.areaId} className="flex items-center justify-between gap-3">
                <span className="mono-label">{a.areaId}</span>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {a.count} {a.count === 1 ? "Frage" : "Fragen"} im Stapel
                </span>
              </li>
            ))}
          </ul>
        </Tile>
      ) : null}
    </Bento>
  );
}

export default function WiederholungPage() {
  const loadedStack = useAfterMount<LeitnerStack | null>(loadStack, null);
  // After an answer the page works on the updated stack, as before.
  const [answeredStack, setAnsweredStack] = useState<LeitnerStack | null>(null);
  const stack = answeredStack ?? loadedStack;
  const online = useOnline();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  // Fragen kommen aus dem veröffentlichten Kurs; nach hartem Reload erst laden.
  const [pathReady, setPathReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPhaseAPathUnits().then(() => {
      if (!cancelled) setPathReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Die Fälligkeitsliste bleibt für die ganze Runde fest: Antworten verschieben
  // dueAt und würden sonst Fragen aus der Liste fallen lassen.
  const due = useMemo(
    () => (loadedStack ? dueItems(loadedStack, new Date(), 10) : []),
    [loadedStack],
  );
  const currentItem = due[index];
  const question = currentItem
    ? getQuestionById(currentItem.questionId)
    : undefined;

  function onChecked(result: AnswerResult) {
    if (!currentItem || !question || revealed) return;
    setRevealed(true);
    let nextStack = stack ?? loadStack();
    nextStack = result.correct
      ? markCorrect(nextStack, currentItem.questionId, {
          anwenden: question.level === "anwenden",
        })
      : markWrong(nextStack, currentItem.questionId);
    saveStack(nextStack);
    setAnsweredStack(nextStack);
    enqueueProgress({ questionId: currentItem.questionId, correct: result.correct });
    void flushProgress();
    if (result.correct) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (index + 1 >= due.length) {
      const session = loadSession() ?? {
        keyword: "Maschinen- und Anlagenführer",
        variant: "pruefung" as const,
        totalPoints: 1720,
      };
      recordLearningEvent("review");
      saveSession({
        ...session,
        lastResult: {
          unitId: "review",
          unitTitle: "Wiederholung",
          correct: correctCount,
          total: due.length,
          points: correctCount * 15,
          kind: "review",
        },
      });
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
  }

  if (stack === null || !pathReady) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Wiederholung</h1>
          <StateView kind="laden" title="Wiederholungsstapel wird geladen" text="Einen Moment bitte." />
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  if (done) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-[var(--bento-gap)] px-6 pb-6 pt-12">
          <Tile tone="hero">
            <p className="mono-label text-[var(--color-text-muted-on-dark)]">Wiederholung</p>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Wiederholung fertig
            </h1>
            <p className="text-[15px] text-[var(--color-text-soft-on-dark)]">
              {correctCount} von {due.length} richtig. Stapel: {stackSize(stack)}{" "}
              Fragen.
            </p>
            <Link
              href="/ergebnis"
              className={`${linkButton} mt-2 bg-[var(--color-brand-accent)] text-[var(--color-text-primary)]`}
            >
              Zum Ergebnis
            </Link>
          </Tile>
          <Link
            href="/lernpfad"
            className={`${linkButton} border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]`}
          >
            Zum Lernpfad
          </Link>
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  if (due.length === 0 || !question || !currentItem) {
    const nextDue = nextDueAt(stack);
    const summary = loadLearningSummary();
    const goalReached = summary !== "fehler" && summary.goal.reached;
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-[var(--bento-gap)] px-6 pb-6 pt-12">
          <Tile tone="hero">
            <p className="mono-label text-[var(--color-text-muted-on-dark)]">Wiederholung</p>
            <h1
              className="text-[28px] font-bold leading-9"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Heute nichts fällig
            </h1>
            <p className="text-[15px] text-[var(--color-text-soft-on-dark)]">
              {nextDue
                ? `Heute sind keine fälligen Fragen übrig. Die nächsten kommen am ${formatDueDate(nextDue)}.`
                : "Heute sind keine fälligen Fragen übrig. Falsche und Anwenden-Fragen landen hier."}
            </p>
            {goalReached ? (
              <p className="text-[15px] font-medium text-[var(--color-text-soft-on-dark)]">
                Tagesziel erreicht. Deine Serie ist für heute sicher.
              </p>
            ) : null}
            <Link
              href="/lernpfad"
              className={`${linkButton} mt-2 bg-[var(--color-brand-accent)] text-[var(--color-text-primary)]`}
            >
              Zum Lernpfad
            </Link>
          </Tile>
          {stackSize(stack) > 0 ? <ReviewOverview stack={stack} /> : null}
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="px-6 pb-2 pt-12">
        <p className="mono-label text-[var(--color-text-secondary)]">
          Wiederholung {index + 1} von {due.length} · Stufe {currentItem.stage}
        </p>
        <h1
          className="mt-1 text-[26px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Fällige Fragen
        </h1>
        <div className="mt-3">
          <Progress
            value={Math.round(((index + (revealed ? 1 : 0)) / due.length) * 100)}
            label="Fortschritt dieser Wiederholung"
          />
        </div>
      </header>
      {online ? null : (
        <section className="px-6">
          <StateView kind="offline" text="Antworten werden gespeichert und später gesendet." />
        </section>
      )}
      <section className="flex flex-1 flex-col gap-3 px-6 pb-8 pt-4">
        <Tile as="div">
          <h2
            className="text-lg font-medium leading-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {question.prompt}
          </h2>
          <QuestionPanel
            key={question.id + String(index)}
            question={question}
            revealed={revealed}
            onChecked={onChecked}
          />
          {revealed ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-[var(--color-text-secondary)]" role="status">
                {question.explanation}
              </p>
              <Button onClick={next}>
                {index + 1 >= due.length ? "Abschließen" : "Weiter"}
              </Button>
            </div>
          ) : null}
        </Tile>
      </section>
      <BottomNav />
    </MobileShell>
  );
}
