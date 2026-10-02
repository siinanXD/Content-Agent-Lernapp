"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionChoice } from "@/components/ui/option-choice";
import { MobileShell } from "@/components/learner/mobile-shell";
import { getUnit } from "@/lib/learner/playable-path";
import { loadSession, saveSession } from "@/lib/learner/session";

export default function EinheitPage() {
  const params = useParams<{ unitId: string }>();
  const router = useRouter();
  const unit = useMemo(() => getUnit(params.unitId), [params.unitId]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

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

  const current = unit;
  const question = current.questions[index];
  const total = current.questions.length;

  function checkAnswer() {
    if (!question || !selected || revealed) return;
    if (selected === question.correct) setCorrectCount((c) => c + 1);
    setRevealed(true);
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
        unitId: current.id,
        unitTitle: current.title,
        correct: scored,
        total,
        points,
      },
    });
    router.push("/ergebnis");
  }

  function next() {
    if (!question) return;
    if (index + 1 >= total) {
      finish(correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  function optionState(choice: string) {
    if (!revealed) return selected === choice ? "selected" : "default";
    if (choice === question!.correct) return "correct";
    if (choice === selected) return "wrong";
    return "default";
  }

  return (
    <MobileShell>
      <header className="px-6 pb-2 pt-12">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Einheit {current.indexLabel} · {current.minutes} Min
        </p>
        <h1
          className="mt-1 text-[26px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {current.title}
        </h1>
      </header>

      <section className="px-6 py-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Erklärung
          </p>
          <p className="mt-2 text-[15px] leading-6 text-[var(--color-text-primary)]">
            {current.explanation}
          </p>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
            {current.sourceLabel}
          </p>
        </div>
      </section>

      {question ? (
        <section className="flex flex-1 flex-col gap-3 px-6 pb-8 pt-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Frage {index + 1} von {total}
          </p>
          <h2
            className="text-lg font-medium leading-6 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {question.prompt}
          </h2>
          <div className="flex flex-col gap-2.5">
            {question.choices.map((choice) => (
              <OptionChoice
                key={choice}
                label={choice}
                state={optionState(choice)}
                disabled={revealed}
                onSelect={() => setSelected(choice)}
              />
            ))}
          </div>
          {!revealed ? (
            <Button onClick={checkAnswer} disabled={!selected} className="mt-2">
              Antwort prüfen
            </Button>
          ) : (
            <Button onClick={next} className="mt-2">
              {index + 1 >= total ? "Ergebnis anzeigen" : "Weiter"}
            </Button>
          )}
        </section>
      ) : null}
    </MobileShell>
  );
}
