"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bento, Tile } from "@/components/ui/tile";
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

const linkButton =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-3.5 text-base font-medium text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Restzeit als m:ss. */
function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Fragen-Raster (Figma W7): aktuelle, beantwortete, markierte und offene Fragen. Nur Anzeige, die Reihenfolge bleibt fest. */
function QuestionGrid({
  total,
  current,
  answered,
  marked,
}: {
  total: number;
  current: number;
  answered: number;
  marked: ReadonlySet<number>;
}) {
  return (
    <ol aria-label="Fragen-Übersicht" className="flex flex-wrap gap-2">
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === current;
        const isAnswered = i < answered;
        const isMarked = marked.has(i);
        const state = [
          isCurrent ? "aktuell" : isAnswered ? "beantwortet" : "offen",
          isMarked ? "markiert" : null,
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <li
            key={i}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`Frage ${i + 1}: ${state}`}
            className={`mono-label flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${
              isCurrent
                ? "bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)]"
                : isAnswered
                  ? "bg-[var(--color-bg-avatar)] text-[var(--color-text-primary)]"
                  : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
            } ${isMarked ? "outline outline-2 outline-offset-1 outline-dashed outline-[var(--color-brand-primary)]" : ""}`}
          >
            <span aria-hidden="true">{i + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}

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
  const [marked, setMarked] = useState<ReadonlySet<number>>(new Set());
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
    setMarked(new Set());
    setRevealed(false);
  }

  function toggleMark() {
    setMarked((m) => {
      const n = new Set(m);
      if (!n.delete(index)) n.add(index);
      return n;
    });
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
        <main className="flex flex-1 flex-col gap-[var(--bento-gap)] px-6 pb-6 pt-12">
          <Tile tone="hero">
            <p className="mono-label text-[var(--color-text-muted-on-dark)]">
              {part.durationMinutes} Min
              {part.weightPercent != null ? ` · ${part.weightPercent} %` : ""} ·{" "}
              {Math.min(8, part.questionTarget)} Fragen
            </p>
            <h1
              className="text-[28px] font-bold leading-9"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Prüfungsmodus
            </h1>
            <p className="text-[15px] text-[var(--color-text-soft-on-dark)]">
              {mafExamTimesSummary()}
            </p>
            <Button
              onClick={start}
              className="mt-2 !bg-[var(--color-brand-accent)] !text-[var(--color-text-primary)]"
            >
              Prüfung starten
            </Button>
          </Tile>
          <Bento>
            <Tile as="div">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="mono-label text-[var(--color-text-secondary)]">
                  Schriftlicher Teil
                </span>
                <select
                  className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
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
            </Tile>
            <Tile tone="hint" as="div">
              <p className="mono-label">Übung, keine IHK-Prognose</p>
              <p className="text-sm leading-5">
                Demo: {Math.min(8, part.questionTarget)} Fragen (Ziel laut Vorgabe{" "}
                {part.questionTarget}). Zeit läuft sichtbar; Pause ist erlaubt.
                Offene Aufgaben nur mit Musterlösung, keine KI-Bewertung.
                Praktischer Teil wird nicht nachgebildet.
              </p>
            </Tile>
          </Bento>
          <Link href="/lernpfad" className={linkButton}>
            Zurück zum Lernpfad
          </Link>
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  const overdue = secondsLeft === 0;

  return (
    <MobileShell>
      <header className="flex flex-col gap-3 px-6 pb-2 pt-12">
        <div className="flex items-center justify-between gap-2">
          <p className="mono-label text-[var(--color-text-secondary)]">
            {part.bereich} · Frage {index + 1}/{questions.length}
          </p>
          <p className="mono-label rounded-full bg-[var(--color-bg-hint)] px-3 py-1 text-[var(--color-text-hint)]">
            <span className="sr-only">Restzeit </span>
            {paused ? "Pause" : formatClock(secondsLeft)}
          </p>
        </div>
        <h1
          className="text-[24px] font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {part.title}
        </h1>
        <QuestionGrid
          total={questions.length}
          current={index}
          answered={answers.length}
          marked={marked}
        />
        {overdue ? (
          <p role="status" className="text-sm text-[var(--color-text-hint)]">
            Die Zeit ist abgelaufen. Du kannst in Ruhe weiterarbeiten.
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="!w-auto px-4 py-2 text-sm"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Fortsetzen" : "Pause"}
          </Button>
          <Button
            variant="secondary"
            className="!w-auto px-4 py-2 text-sm"
            onClick={toggleMark}
          >
            {marked.has(index) ? "Markierung entfernen" : "Markieren"}
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
