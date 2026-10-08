"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnswerFeedback } from "@/components/ui/answer-feedback";
import { Button } from "@/components/ui/button";
import { SourceChip } from "@/components/ui/source-chip";
import { StateView } from "@/components/ui/state-view";
import { Tile } from "@/components/ui/tile";
import { correctAnswerText } from "@/lib/learner/feedback";
import { WhyPanel } from "@/components/learner/why-panel";
import { MobileShell } from "@/components/learner/mobile-shell";
import { UnitImageView } from "@/components/learner/unit-image";
import {
  QuestionPanel,
  type AnswerResult,
} from "@/components/learner/question-panel";
import { useA11y } from "@/components/a11y/a11y-provider";
import { speakGerman } from "@/lib/a11y/preferences";
import {
  getUnit,
  unitExplanation,
} from "@/lib/learner/playable-path";
import { fetchPhaseAPathUnits } from "@/lib/learner/phase-a-path";
import { loadSession, saveSession } from "@/lib/learner/session";
import { recordLearningEvent } from "@/lib/learner/streak";
import {
  loadStack,
  markCorrect,
  markWrong,
  saveStack,
} from "@/lib/learner/leitner";
import {
  enqueueProgress,
  flushProgress,
} from "@/lib/learner/progress-outbox";
import { useOnline } from "@/lib/use-online";
import {
  trackExplanationReported,
  trackQuestionAnswered,
  trackUnitAbandoned,
  trackUnitCompleted,
  trackUnitStarted,
} from "@/lib/analytics";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function EinheitPage() {
  const rawParams = useParams<{ unitId: string }>();
  // Next liefert die Id URL-kodiert; Ids wie „M0-1:u1“ würden sonst nie gefunden.
  const params = { unitId: safeDecode(rawParams.unitId) };
  const router = useRouter();
  const { prefs } = useA11y();
  const online = useOnline();
  // The unit is resolved once per id: from seed/cache on the first render, or
  // after the Phase A fetch below. It stays fixed while the lesson runs.
  const [resolved, setResolved] = useState(() => ({
    unitId: params.unitId,
    unit: getUnit(params.unitId),
    fetched: false,
  }));
  const current =
    resolved.unitId === params.unitId
      ? resolved
      : { unitId: params.unitId, unit: getUnit(params.unitId), fetched: false };
  const unit = current.unit;
  const loading = !unit && !current.fetched;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [awaitSelfCheck, setAwaitSelfCheck] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);

  // Nach „Weiter“ verschwindet der fokussierte Button: Fokus auf die neue Frage setzen.
  useEffect(() => {
    if (index > 0) questionHeading.current?.focus();
  }, [index]);

  useEffect(() => {
    if (!loading) return;
    let cancelled = false;
    fetchPhaseAPathUnits().then(() => {
      if (cancelled) return;
      setResolved({
        unitId: params.unitId,
        unit: getUnit(params.unitId),
        fetched: true,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [params.unitId, loading]);

  useEffect(() => {
    if (!unit) return;
    trackUnitStarted({
      unitId: unit.id,
      unitTitle: unit.title,
      moduleId: unit.moduleId,
      variant: unit.variant,
    });
    // Fire once per unit id when the Einheit becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: track by unit.id only
  }, [unit?.id]);

  // Abbruch: Einheit verlassen (Weg, Tab zu), ohne dass finish() lief. Nur Zahlen, keine Antworten.
  const progress = useRef({ answered: 0, total: 0, finished: false });
  useEffect(() => {
    progress.current.answered = index + (revealed ? 1 : 0);
    progress.current.total = unit?.questions.length ?? 0;
  }, [index, revealed, unit]);
  useEffect(() => {
    if (!unit) return;
    const unitId = unit.id;
    const state = progress.current;
    state.finished = false;
    let sent = false;
    function report() {
      if (sent || state.finished) return;
      sent = true;
      trackUnitAbandoned({ unitId, answered: state.answered, total: state.total });
    }
    window.addEventListener("pagehide", report);
    return () => {
      window.removeEventListener("pagehide", report);
      report();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: nur je Einheit
  }, [unit?.id]);

  if (loading) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-4 px-6 py-16">
          <h1 className="sr-only">Einheit</h1>
          <StateView kind="laden" title="Einheit wird geladen" />
        </main>
      </MobileShell>
    );
  }

  if (!unit) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-4 px-6 py-16">
          <h1 className="sr-only">Einheit</h1>
          <StateView
            kind="fehler"
            title="Einheit nicht gefunden"
            text="Diese Einheit gibt es nicht oder sie ist noch nicht veröffentlicht."
          >
            <Button onClick={() => router.push("/lernpfad")}>Zum Lernpfad</Button>
          </StateView>
        </main>
      </MobileShell>
    );
  }

  const question = unit.questions[index];
  const total = unit.questions.length;
  const explanation = unitExplanation(unit, prefs.simpleLanguage);

  function applyLeitner(qid: string, correct: boolean, anwenden: boolean) {
    let stack = loadStack();
    stack = correct
      ? markCorrect(stack, qid, { anwenden })
      : markWrong(stack, qid);
    saveStack(stack);
    enqueueProgress({ unitId: unit?.id, questionId: qid, correct });
    void flushProgress();
  }

  function onChecked(result: AnswerResult) {
    if (!question) return;
    if (result.selfChecked) {
      if (result.correct) setCorrectCount((c) => c + 1);
      setLastCorrect(result.correct);
      setAwaitSelfCheck(false);
      applyLeitner(question.id, result.correct, question.level === "anwenden");
      trackQuestionAnswered({
        unitId: unit!.id,
        questionId: question.id,
        correct: result.correct,
        questionType: question.type,
        level: question.level,
        selfChecked: true,
      });
      return;
    }
    if (revealed) return;
    setRevealed(true);
    setLastCorrect(result.correct);
    if (question.sampleSolution && !question.choices?.length) {
      setAwaitSelfCheck(true);
      return;
    }
    if (result.correct) setCorrectCount((c) => c + 1);
    applyLeitner(question.id, result.correct, question.level === "anwenden");
    trackQuestionAnswered({
      unitId: unit!.id,
      questionId: question.id,
      correct: result.correct,
      questionType: question.type,
      level: question.level,
      selfChecked: false,
    });
  }

  function finish(scored: number) {
    const session = loadSession() ?? {
      keyword: "Maschinen- und Anlagenführer",
      variant: "pruefung" as const,
      totalPoints: 1720,
    };
    recordLearningEvent("unit");
    const points = scored * 20 + 20;
    saveSession({
      ...session,
      totalPoints: session.totalPoints + points,
      lastResult: {
        unitId: unit!.id,
        unitTitle: unit!.title,
        correct: scored,
        total,
        points,
        kind: "unit",
      },
    });
    progress.current.finished = true;
    trackUnitCompleted({
      unitId: unit!.id,
      unitTitle: unit!.title,
      correct: scored,
      total,
      points,
    });
    router.push("/ergebnis");
  }

  function next() {
    if (!question || awaitSelfCheck) return;
    if (index + 1 >= total) {
      finish(correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
    setLastCorrect(false);
    setAwaitSelfCheck(false);
    setWhyOpen(false);
  }

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col">
      <header className="px-6 pb-2 pt-12">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Einheit {unit.indexLabel} · {unit.minutes} Min · {unit.variant}
        </p>
        <h1
          className="mt-1 text-[26px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {unit.title}
        </h1>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {unit.moduleTitle} · {unit.blockTitle}
        </p>
      </header>

      {online ? null : (
        <section className="px-6">
          <StateView kind="offline" text="Antworten werden gespeichert und später gesendet." />
        </section>
      )}

      <section className="px-6 py-2">
        <Tile as="div">
          {unit.sections ? (
            <div className="flex flex-col gap-3">
              <SectionBlock label="Einstieg" text={unit.sections.einstieg} />
              <SectionBlock label="Kern" text={unit.sections.kern} />
              <SectionBlock label="Beispiel" text={unit.sections.beispiel} />
              <SectionBlock label="Merksatz" text={unit.sections.merksatz} />
            </div>
          ) : (
            <>
              <p className="mono-label text-[var(--color-text-secondary)]">
                Erklärung
              </p>
              <p className="mt-2 text-[15px] leading-6 text-[var(--color-text-primary)]">
                {explanation}
              </p>
            </>
          )}
          {unit.image ? <UnitImageView image={unit.image} /> : null}
          <div className="mt-1">
            <SourceChip source={unit.sourceLabel} />
          </div>
          {prefs.readAloud ? (
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => speakGerman(`${unit.title}. ${explanation}`)}
            >
              Erklärung vorlesen
            </Button>
          ) : null}
        </Tile>
      </section>

      {question ? (
        <section className="flex flex-1 flex-col gap-3 px-6 pb-8 pt-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Frage {index + 1} von {total} · {question.type} · {question.level}
          </p>
          <h2
            ref={questionHeading}
            tabIndex={-1}
            className="text-lg font-medium leading-6 text-[var(--color-text-primary)] focus:outline-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {question.prompt}
          </h2>
          {/* Dauerhafte Live-Region: Der Ergebnis-Text wird sicher vorgelesen, weil die Region schon vor dem Inhalt im DOM steht. */}
          <p role="status" className="sr-only">
            {revealed && !awaitSelfCheck
              ? `${lastCorrect ? "Richtig." : "Nicht ganz."} ${
                  lastCorrect ? "" : `Richtige Antwort: ${correctAnswerText(question)}. `
                }${question.explanation}`
              : ""}
          </p>
          <QuestionPanel
            key={question.id}
            question={question}
            revealed={revealed}
            onChecked={onChecked}
          />
          {revealed && !awaitSelfCheck ? (
            <AnswerFeedback
              correct={lastCorrect}
              correctAnswer={correctAnswerText(question)}
              explanation={question.explanation}
              source={question.sourceUrl || undefined}
            >
              {question.sourceUrl ? (
                <Button
                  variant="secondary"
                  aria-expanded={whyOpen}
                  onClick={() => setWhyOpen((o) => !o)}
                >
                  Warum?
                </Button>
              ) : null}
              <Button onClick={next}>
                {index + 1 >= total ? "Ergebnis anzeigen" : "Weiter"}
              </Button>
            </AnswerFeedback>
          ) : null}
          {whyOpen && revealed && question.sourceUrl ? (
            <>
              <div aria-hidden className="h-[60vh]" />
              <WhyPanel
                explanation={question.explanation}
                simpleExplanation={unit.explanationSimple}
                source={question.sourceUrl}
                readAloud={speakGerman}
                onClose={() => setWhyOpen(false)}
                onReport={() =>
                  trackExplanationReported({
                    unitId: unit.id,
                    questionId: question.id,
                  })
                }
              />
            </>
          ) : null}
        </section>
      ) : null}
      </main>
    </MobileShell>
  );
}

function SectionBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mono-label text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 text-[15px] leading-6 text-[var(--color-text-primary)]">
        {text}
      </p>
    </div>
  );
}
