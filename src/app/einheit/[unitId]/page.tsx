"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  loadStack,
  markCorrect,
  markWrong,
  saveStack,
} from "@/lib/learner/leitner";

export default function EinheitPage() {
  const params = useParams<{ unitId: string }>();
  const router = useRouter();
  const { prefs } = useA11y();
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

  if (loading) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-4 px-6 py-16">
          <p className="text-[var(--color-text-secondary)]">Einheit wird geladen…</p>
        </main>
      </MobileShell>
    );
  }

  if (!unit) {
    return (
      <MobileShell>
        <main className="flex flex-1 flex-col gap-4 px-6 py-16">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Einheit nicht gefunden
          </h1>
          <Button onClick={() => router.push("/lernpfad")}>Zum Lernpfad</Button>
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
  }

  function onChecked(result: AnswerResult) {
    if (!question) return;
    if (result.selfChecked) {
      if (result.correct) setCorrectCount((c) => c + 1);
      setLastCorrect(result.correct);
      setAwaitSelfCheck(false);
      applyLeitner(question.id, result.correct, question.level === "anwenden");
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
  }

  function finish(scored: number) {
    const session = loadSession() ?? {
      keyword: "Maschinen- und Anlagenführer",
      variant: "pruefung" as const,
      streakDays: 7,
      totalPoints: 1720,
    };
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
  }

  return (
    <MobileShell>
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

      <section className="px-6 py-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          {unit.sections ? (
            <div className="flex flex-col gap-3">
              <SectionBlock label="Einstieg" text={unit.sections.einstieg} />
              <SectionBlock label="Kern" text={unit.sections.kern} />
              <SectionBlock label="Beispiel" text={unit.sections.beispiel} />
              <SectionBlock label="Merksatz" text={unit.sections.merksatz} />
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Erklärung
              </p>
              <p className="mt-2 text-[15px] leading-6 text-[var(--color-text-primary)]">
                {explanation}
              </p>
            </>
          )}
          {unit.image ? <UnitImageView image={unit.image} /> : null}
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
            {unit.sourceLabel}
          </p>
          {prefs.readAloud ? (
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => speakGerman(`${unit.title}. ${explanation}`)}
            >
              Erklärung vorlesen
            </Button>
          ) : null}
        </div>
      </section>

      {question ? (
        <section className="flex flex-1 flex-col gap-3 px-6 pb-8 pt-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Frage {index + 1} von {total} · {question.type} · {question.level}
          </p>
          <h2
            className="text-lg font-medium leading-6 text-[var(--color-text-primary)]"
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
          {revealed && !awaitSelfCheck ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm leading-5 text-[var(--color-text-secondary)]" role="status">
                {lastCorrect ? "Richtig. " : "Nicht ganz. "}
                {question.explanation}
                {question.sourceUrl ? ` Quelle: ${question.sourceUrl}` : ""}
              </p>
              <Button onClick={next} className="mt-1">
                {index + 1 >= total ? "Ergebnis anzeigen" : "Weiter"}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </MobileShell>
  );
}

function SectionBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className="mt-1 text-[15px] leading-6 text-[var(--color-text-primary)]">
        {text}
      </p>
    </div>
  );
}
