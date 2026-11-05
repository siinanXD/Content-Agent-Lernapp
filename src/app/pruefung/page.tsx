"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bento, Tile } from "@/components/ui/tile";
import { MobileShell } from "@/components/learner/mobile-shell";
import { BottomNav } from "@/components/learner/bottom-nav";
import {
  QuestionPanel,
  type AnswerResult,
} from "@/components/learner/question-panel";
import { buildExamPool, examSeconds, isOpenTask, listExamParts, scoreByArea } from "@/lib/learner/exam";
import { isDemoMode } from "@/lib/learner/demo-modus";
import {
  activeCourse,
  fetchPublishedPathUnits,
  phaseAPathUnits,
  setActiveCourse,
} from "@/lib/learner/phase-a-path";
import type { PathUnit } from "@/lib/learner/playable-path";
import { toReviewItem, type ReviewItem } from "@/lib/learner/exam-result";
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
  // Kurs aus der Adresse (Lernpfad) oder dem zuletzt geöffneten; so zeigt die Prüfung nie die eines anderen Kurses.
  const [courseId] = useState(() => search.get("kurs") ?? activeCourse());
  const allParts = useMemo(() => listExamParts(courseId), [courseId]);
  const parts = useMemo(() => allParts.filter((p) => p.simulated), [allParts]);
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
      open?: boolean;
      review: ReviewItem;
    }>
  >([]);

  const part = parts.find((p) => p.id === partId) ?? parts[0];
  // Nur veröffentlichte Kursfragen; Beispieldaten nur im ausdrücklichen Beispielmodus (SIN-1449).
  const [units, setUnits] = useState<PathUnit[] | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setActiveCourse(courseId);
    const load = isDemoMode()
      ? Promise.resolve(phaseAPathUnits())
      : fetchPublishedPathUnits(courseId);
    void load.then((u) => live && setUnits(u));
    return () => {
      live = false;
    };
  }, [courseId]);
  const pool = useMemo(
    () => (part && units ? buildExamPool(part.id, units, courseId) : null),
    [part, units, courseId],
  );
  const questions = useMemo(() => pool?.questions ?? [], [pool]);
  const gaps = pool?.areas.filter((a) => a.available < a.quota) ?? [];
  const question = questions[index];
  const finishing = useRef(false);

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
    if (questions.length === 0) return;
    finishing.current = false;
    setSecondsLeft(examSeconds(part.durationMinutes));
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

  // Im Prüfungsmodus wird die Antwort nur gespeichert; Lösung und Erklärung stehen erst im Ergebnis (SIN-1538).
  function onChecked(result: AnswerResult) {
    if (!question || revealed) return;
    setRevealed(true);
    setAnswers((a) => [
      ...a,
      {
        questionId: question.id,
        correct: result.correct,
        examAreas: question.examAreas,
        open: result.open,
        review: toReviewItem(question, result),
      },
    ]);
  }

  function finish() {
    if (!part || finishing.current) return;
    finishing.current = true;
    const areaResults = scoreByArea(answers, pool?.areas ?? part.gebiete);
    const correct = answers.filter((a) => a.correct && !a.open).length;
    const wrongAnswers = answers.flatMap((a) => (!a.open && !a.correct ? [a.review] : []));
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
        total: questions.filter((q) => !isOpenTask(q)).length,
        points: correct * 10,
        kind: "exam",
        areaResults,
        partTitle: part.title,
        wrongAnswers,
        review: answers.map((a) => a.review),
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

  // Zeit abgelaufen: die Prüfung endet mit dem, was beantwortet ist (so steht es auch auf der Startseite).
  const expired = started && secondsLeft === 0;
  useEffect(() => {
    if (expired) finish();
    // finish liest nur den aktuellen Stand; einmal beim Ablauf genügt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  if (!part) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-4 px-6 pb-6 pt-12">
          <h1 className="text-[24px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Prüfungsmodus
          </h1>
          <p role="status">Für diesen Kurs gibt es noch keinen Prüfungsmodus.</p>
          <Link href="/lernpfad" className={linkButton}>
            Zurück zum Lernpfad
          </Link>
        </main>
        <BottomNav />
      </MobileShell>
    );
  }

  if (!started) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-[var(--bento-gap)] px-6 pb-6 pt-12">
          <Tile tone="hero" className="!p-[var(--bento-pad)]">
            <p className="mono-label text-[var(--color-text-muted-on-dark)]">
              {part.durationMinutes} Min · {units === undefined ? "…" : questions.length} Fragen
            </p>
            <h1
              className="text-[28px] font-bold leading-9"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Prüfungsmodus
            </h1>
            <p className="text-[15px] text-[var(--color-text-soft-on-dark)]">
              Schriftlicher Teil wie in der Abschlussprüfung. Die Zeit läuft sichtbar, Pause ist
              erlaubt. Läuft die Zeit ab, endet die Prüfung mit den bisherigen Antworten.
            </p>
            {units !== undefined && questions.length === 0 ? (
              <p role="status" className="text-[15px]">
                Für diesen Teil gibt es noch keine veröffentlichten Fragen im Kurs. Die Prüfung
                startet, sobald welche da sind.
              </p>
            ) : units && questions.length < part.questionTarget ? (
              <div role="status" className="text-[15px]">
                <p>
                  Der Kurs hat bisher {questions.length} von {part.questionTarget} Fragen für diesen
                  Teil. Es wird nichts aufgefüllt, die Prüfung ist kürzer, die Zeit bleibt gleich.
                </p>
                <p className="mt-1">
                  Zu wenige Fragen:{" "}
                  {gaps.map((g) => `${g.id}: ${g.available} von ${g.quota}`).join(", ")}.
                </p>
              </div>
            ) : null}
            <Button
              onClick={start}
              className="mt-2"
              disabled={units === undefined || questions.length === 0}
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
                  value={part.id}
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
            {pool ? (
              <Tile aria-labelledby="aufbau-titel">
                <h2
                  id="aufbau-titel"
                  className="text-[17px] font-semibold leading-[22px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Aufbau: {part.bereich}
                </h2>
                <ul className="flex flex-col gap-2">
                  {pool.areas.map((a) => (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        <span className="mono-label mr-2 text-[var(--color-text-secondary)]">{a.id}</span>
                        {a.title}
                      </span>
                      <span className="shrink-0 text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                        {a.taken} von {a.quota} Fragen
                      </span>
                    </li>
                  ))}
                </ul>
              </Tile>
            ) : null}
            <Tile tone="hint" as="div">
              <p className="mono-label">Übung, keine IHK-Prognose</p>
              <p className="text-sm leading-5">
                Offene Aufgaben nur mit Musterlösung, keine KI-Bewertung. Der praktische Teil wird
                nicht nachgebildet.
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
          {/* Nach dem Speichern gesperrt, nie aufgedeckt: Lösung und Erklärung erst im Ergebnis. */}
          <fieldset disabled={revealed} className="min-w-0 border-0 p-0">
            <QuestionPanel
              key={question.id}
              question={question}
              revealed={false}
              onChecked={onChecked}
              exam
            />
          </fieldset>
          {revealed ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-[var(--color-text-secondary)]" role="status">
                Antwort gespeichert. Lösung und Erklärung stehen im Ergebnis.
              </p>
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
