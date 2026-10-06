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
import { StateView } from "@/components/ui/state-view";
import { useOnline } from "@/lib/use-online";
import { loadSession, saveSession } from "@/lib/learner/session";
import { useAfterMount } from "@/lib/use-after-mount";

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
        streakDays: 7,
        totalPoints: 1720,
      };
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
        <main className="px-6 py-16">
          <p>Lade Wiederholungsstapel …</p>
        </main>
      </MobileShell>
    );
  }

  if (done) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-4 px-6 py-16">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Wiederholung fertig
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)]">
            {correctCount} von {due.length} richtig. Stapel: {stackSize(stack)}{" "}
            Fragen.
          </p>
          <Link href="/ergebnis">
            <Button>Zum Ergebnis</Button>
          </Link>
          <Link href="/lernpfad">
            <Button variant="secondary">Zum Lernpfad</Button>
          </Link>
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  if (due.length === 0 || !question || !currentItem) {
    return (
      <MobileShell>
        <header className="px-6 pb-4 pt-12">
          <h1
            className="text-[28px] font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Wiederholung
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
            Leitner 1/3/7/14 Tage · keine fälligen Fragen
          </p>
        </header>
        <main className="flex flex-1 flex-col gap-3 px-6">
          <p className="text-[15px] text-[var(--color-text-primary)]">
            Stapelgröße: {stackSize(stack)}. Bearbeite Einheiten — falsche und
            Anwenden-Fragen landen hier.
          </p>
          <Link href="/einheit/unit-03">
            <Button>Einheit üben</Button>
          </Link>
          <Link href="/lernpfad">
            <Button variant="secondary">Zum Lernpfad</Button>
          </Link>
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="px-6 pb-2 pt-12">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Wiederholung {index + 1} von {due.length} · Stufe {currentItem.stage}
        </p>
        <h1
          className="mt-1 text-[26px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Fällige Fragen
        </h1>
      </header>
      {online ? null : (
        <section className="px-6">
          <StateView kind="offline" text="Antworten werden gespeichert und später gesendet." />
        </section>
      )}
      <section className="flex flex-1 flex-col gap-3 px-6 pb-8 pt-4">
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
      </section>
      <BottomNav />
    </MobileShell>
  );
}
