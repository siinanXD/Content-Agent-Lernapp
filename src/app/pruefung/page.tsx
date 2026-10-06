"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/learner/mobile-shell";
import { BottomNav } from "@/components/learner/bottom-nav";
import {
  QuestionPanel,
  type AnswerResult,
} from "@/components/learner/question-panel";
import {
  getExamQuestions,
  listExamParts,
  mafExamTimesSummary,
  scoreByArea,
} from "@/lib/learner/exam";
import { toWrongAnswer, type WrongAnswer } from "@/lib/learner/exam-result";
import { loadStack, markWrong, saveStack } from "@/lib/learner/leitner";
import { loadSession, saveSession } from "@/lib/learner/session";
import { recordLearningEvent } from "@/lib/learner/streak";

function PruefungInner() {
  const router = useRouter();
  const search = useSearchParams();
  const parts = useMemo(() => listExamParts().filter((p) => p.simulated), []);
  const initial = search.get("part") ?? parts[0]?.id ?? "PT";
  const [partId, setPartId] = useState(initial);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<
    Array<{
      questionId: string;
      correct: boolean;
      examAreas: string[];
      wrong?: WrongAnswer;
    }>
  >([]);

  const part = parts.find((p) => p.id === partId) ?? parts[0];
  const questions = useMemo(
    () => (part ? getExamQuestions(part.id).slice(0, Math.min(8, part.questionTarget || 8)) : []),
    [part],
  );
  const question = questions[index];

  useEffect(() => {
    if (!started || paused || !part?.durationMinutes) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, paused, part?.durationMinutes]);

  function start() {
    if (!part?.durationMinutes) return;
    // Demo timer: 1 second per exam minute (real duration shown in label).
    setSecondsLeft(part.durationMinutes);
    setStarted(true);
    setPaused(false);
    setIndex(0);
    setAnswers([]);
    setRevealed(false);
  }

  function onChecked(result: AnswerResult) {
    if (!question || revealed) return;
    setRevealed(true);
    setAnswers((a) => [
      ...a,
      {
        questionId: question.id,
        correct: result.correct,
        examAreas: question.examAreas,
        wrong: result.correct ? undefined : toWrongAnswer(question),
      },
    ]);
  }

  function finish() {
    if (!part) return;
    const areaResults = scoreByArea(answers, part.gebiete);
    const correct = answers.filter((a) => a.correct).length;
    const wrongAnswers = answers.flatMap((a) => (a.wrong ? [a.wrong] : []));
    // Falsche Fragen kommen in die Wiederholung (Leitner: Stufe 1, nach 1, 3 und 7 Tagen).
    saveStack(
      wrongAnswers.reduce((stack, w) => markWrong(stack, w.id), loadStack()),
    );
    const session = loadSession() ?? {
      keyword: "Maschinen- und Anlagenführer",
      variant: "pruefung" as const,
      totalPoints: 1720,
    };
    recordLearningEvent("exam");
    saveSession({
      ...session,
      lastResult: {
        unitId: `exam-${part.id}`,
        unitTitle: part.bereich,
        correct,
        total: answers.length || questions.length,
        points: correct * 10,
        kind: "exam",
        areaResults,
        partTitle: part.title,
        wrongAnswers,
      },
    });
    router.push("/pruefung/ergebnis");
  }

  function next() {
    if (index + 1 >= questions.length) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
  }

  if (!part) {
    return (
      <MobileShell>
        <main className="px-6 py-16">
          <p>Kein schriftlicher Prüfungsteil in der Map.</p>
        </main>
      </MobileShell>
    );
  }

  if (!started) {
    return (
      <MobileShell>
        <header className="px-6 pb-4 pt-12">
          <h1
            className="text-[28px] font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Prüfungsmodus
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
            {mafExamTimesSummary()}
          </p>
        </header>
        <section className="flex flex-1 flex-col gap-3 px-6 pb-8">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">
              Schriftlicher Teil
            </span>
            <select
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
            >
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bereich} · {p.durationMinutes} Min
                  {p.weightPercent != null ? ` · ${p.weightPercent}%` : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Demo: {Math.min(8, part.questionTarget)} Fragen (Ziel laut Vorgabe{" "}
            {part.questionTarget}). Zeit läuft sichtbar; Pause ist erlaubt.
            Offene Aufgaben nur mit Musterlösung — keine KI-Bewertung.
            Praktischer Teil wird nicht nachgebildet.
          </p>
          <Button onClick={start}>Prüfung starten</Button>
          <Link href="/lernpfad">
            <Button variant="secondary">Zurück zum Lernpfad</Button>
          </Link>
        </section>
        <BottomNav />
      </MobileShell>
    );
  }

  const overdue = secondsLeft === 0;

  return (
    <MobileShell>
      <header className="px-6 pb-2 pt-12">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {part.bereich} · Frage {index + 1}/{questions.length}
          </p>
          <p
            className="text-sm font-medium text-[var(--color-brand-primary)]"
            aria-live="polite"
          >
            {paused ? "Pause" : `${secondsLeft} s`}
            {overdue ? " · Zeit hinweis" : ""}
          </p>
        </div>
        <h1
          className="mt-1 text-[24px] font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {part.title}
        </h1>
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            className="!w-auto px-3 py-2 text-sm"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Fortsetzen" : "Pause"}
          </Button>
        </div>
      </header>
      {question ? (
        <section className="flex flex-1 flex-col gap-3 px-6 pb-8 pt-4">
          <h2
            className="text-lg font-medium leading-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {question.prompt}
          </h2>
          <QuestionPanel
            key={question.id}
            question={question}
            revealed={revealed}
            onChecked={onChecked}
          />
          {revealed ? (
            <div className="flex flex-col gap-2">
              {question.sampleSolution && !question.choices?.length ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Musterlösung zur Selbstkontrolle — keine KI-Note.
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]" role="status">
                  {question.explanation}
                </p>
              )}
              <Button onClick={next}>
                {index + 1 >= questions.length
                  ? "Ergebnis je Gebiet"
                  : "Weiter"}
              </Button>
            </div>
          ) : null}
        </section>
      ) : (
        <main className="px-6 py-8">
          <p>Keine Fragen für diesen Teil.</p>
          <Button onClick={finish}>Ergebnis anzeigen</Button>
        </main>
      )}
    </MobileShell>
  );
}

export default function PruefungPage() {
  return (
    <Suspense
      fallback={
        <MobileShell>
          <main className="px-6 py-16">Lade Prüfungsmodus …</main>
        </MobileShell>
      }
    >
      <PruefungInner />
    </Suspense>
  );
}
