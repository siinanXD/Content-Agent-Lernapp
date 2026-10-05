"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionChoice } from "@/components/ui/option-choice";
import { TextField } from "@/components/ui/text-field";
import { UnitImageView } from "@/components/learner/unit-image";
import type { PathQuestion } from "@/lib/learner/playable-path";

export type AnswerResult = {
  correct: boolean;
  /** For open tasks: learner self-checked against sample — never AI graded. */
  selfChecked?: boolean;
};

export function QuestionPanel({
  question,
  revealed,
  onChecked,
}: {
  question: PathQuestion;
  revealed: boolean;
  onChecked: (result: AnswerResult) => void;
}) {
  if (question.type === "zuordnen" && question.pairs?.length) {
    return (
      <PairQuestion question={question} revealed={revealed} onChecked={onChecked} />
    );
  }
  if (question.type === "lueckentext") {
    return (
      <BlankQuestion question={question} revealed={revealed} onChecked={onChecked} />
    );
  }
  if (question.type === "reihenfolge" && question.steps?.length) {
    return (
      <OrderQuestion question={question} revealed={revealed} onChecked={onChecked} />
    );
  }
  if (question.type === "rechnen" && question.sampleSolution) {
    return (
      <OpenOrChoiceQuestion question={question} revealed={revealed} onChecked={onChecked} />
    );
  }
  return (
    <ChoiceQuestion question={question} revealed={revealed} onChecked={onChecked} />
  );
}

function ChoiceQuestion({
  question,
  revealed,
  onChecked,
}: {
  question: PathQuestion;
  revealed: boolean;
  onChecked: (result: AnswerResult) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const correct = Array.isArray(question.correct)
    ? question.correct[0]!
    : question.correct;
  const choices = question.choices ?? [];

  function optionState(choice: string) {
    if (!revealed) return selected === choice ? "selected" : "default";
    if (choice === correct) return "correct";
    if (choice === selected) return "wrong";
    return "default";
  }

  return (
    <div className="flex flex-col gap-2.5">
      {question.image ? <UnitImageView image={question.image} /> : null}
      {choices.map((choice) => (
        <OptionChoice
          key={choice}
          label={choice}
          state={optionState(choice)}
          disabled={revealed}
          onSelect={() => setSelected(choice)}
        />
      ))}
      {!revealed ? (
        <Button
          onClick={() =>
            selected && onChecked({ correct: selected === correct })
          }
          disabled={!selected}
          className="mt-2"
        >
          Antwort prüfen
        </Button>
      ) : null}
    </div>
  );
}

function BlankQuestion({
  question,
  revealed,
  onChecked,
}: {
  question: PathQuestion;
  revealed: boolean;
  onChecked: (result: AnswerResult) => void;
}) {
  const bank = question.blanks?.length
    ? question.blanks
    : [String(Array.isArray(question.correct) ? question.correct[0] : question.correct)];
  const correct = String(
    Array.isArray(question.correct) ? question.correct[0] : question.correct,
  );
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2.5" role="group" aria-label="Lückentext">
      <p className="text-sm text-[var(--color-text-secondary)]">Wortliste</p>
      {bank.map((word) => (
        <OptionChoice
          key={word}
          label={word}
          state={
            !revealed
              ? selected === word
                ? "selected"
                : "default"
              : word === correct
                ? "correct"
                : word === selected
                  ? "wrong"
                  : "default"
          }
          disabled={revealed}
          onSelect={() => setSelected(word)}
        />
      ))}
      {!revealed ? (
        <Button
          onClick={() => selected && onChecked({ correct: selected === correct })}
          disabled={!selected}
          className="mt-2"
        >
          Antwort prüfen
        </Button>
      ) : null}
    </div>
  );
}

function PairQuestion({
  question,
  revealed,
  onChecked,
}: {
  question: PathQuestion;
  revealed: boolean;
  onChecked: (result: AnswerResult) => void;
}) {
  const pairs = question.pairs ?? [];
  const rights = useMemo(() => {
    const base = pairs.map(([, r]) => r);
    const extras = (question.choices ?? []).filter((c) => !base.includes(c));
    return shuffleStable([...base, ...extras], question.id);
  }, [pairs, question.choices, question.id]);
  const [picks, setPicks] = useState<Record<number, string>>({});

  const allPicked = pairs.every((_, i) => picks[i]);
  const isCorrect =
    pairs.every(([_, right], i) => picks[i] === right) &&
    Object.keys(picks).length === pairs.length;

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Zuordnen">
      {question.image ? <UnitImageView image={question.image} /> : null}
      {pairs.map(([left], i) => (
        <label key={left} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {left}
          </span>
          <select
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            disabled={revealed}
            value={picks[i] ?? ""}
            onChange={(e) => setPicks((p) => ({ ...p, [i]: e.target.value }))}
            aria-label={`Zuordnung für ${left}`}
          >
            <option value="">Bitte wählen</option>
            {rights.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      ))}
      {!revealed ? (
        <Button
          onClick={() => onChecked({ correct: isCorrect })}
          disabled={!allPicked}
          className="mt-2"
        >
          Antwort prüfen
        </Button>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]" role="status">
          {isCorrect ? "Alle Zuordnungen stimmen." : "Mindestens eine Zuordnung war falsch."}
        </p>
      )}
    </div>
  );
}

function OrderQuestion({
  question,
  revealed,
  onChecked,
}: {
  question: PathQuestion;
  revealed: boolean;
  onChecked: (result: AnswerResult) => void;
}) {
  const steps = question.steps ?? [];
  const [order, setOrder] = useState(() => shuffleStable([...steps], question.id));

  function move(i: number, dir: -1 | 1) {
    setOrder((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }

  const correct =
    order.length === steps.length && order.every((s, i) => s === steps[i]);

  return (
    <div className="flex flex-col gap-2.5">
      {question.image ? <UnitImageView image={question.image} /> : null}
      <div className="flex flex-col gap-2.5" role="list" aria-label="Reihenfolge">
      {order.map((step, i) => (
        <div
          key={`${step}-${i}`}
          role="listitem"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2"
        >
          <span className="flex-1 text-[15px] text-[var(--color-text-primary)]">
            {i + 1}. {step}
          </span>
          <button
            type="button"
            className="min-h-10 min-w-10 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            aria-label={`${step} nach oben`}
            disabled={revealed || i === 0}
            onClick={() => move(i, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="min-h-10 min-w-10 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            aria-label={`${step} nach unten`}
            disabled={revealed || i === order.length - 1}
            onClick={() => move(i, 1)}
          >
            ↓
          </button>
        </div>
      ))}
      </div>
      {!revealed ? (
        <Button onClick={() => onChecked({ correct })} className="mt-2">
          Antwort prüfen
        </Button>
      ) : null}
    </div>
  );
}

/** Rechnen: choice when choices exist; otherwise open with sample solution only. */
function OpenOrChoiceQuestion({
  question,
  revealed,
  onChecked,
}: {
  question: PathQuestion;
  revealed: boolean;
  onChecked: (result: AnswerResult) => void;
}) {
  if (question.choices?.length) {
    return (
      <ChoiceQuestion question={question} revealed={revealed} onChecked={onChecked} />
    );
  }
  return (
    <OpenSampleQuestion question={question} revealed={revealed} onChecked={onChecked} />
  );
}

function OpenSampleQuestion({
  question,
  revealed,
  onChecked,
}: {
  question: PathQuestion;
  revealed: boolean;
  onChecked: (result: AnswerResult) => void;
}) {
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const checklist = question.sampleChecklist ?? [];

  return (
    <div className="flex flex-col gap-3">
      <TextField
        id={`open-${question.id}`}
        label="Deine Lösung (wird nicht von KI bewertet)"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={revealed}
      />
      {!revealed ? (
        <Button
          onClick={() => onChecked({ correct: false, selfChecked: false })}
          disabled={!draft.trim()}
        >
          Musterlösung zeigen
        </Button>
      ) : (
        <div
          className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3"
          role="region"
          aria-label="Musterlösung zur Selbstkontrolle"
        >
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Musterlösung (Selbstkontrolle — keine KI-Note)
          </p>
          <p className="mt-2 text-[15px] leading-6 text-[var(--color-text-primary)]">
            {question.sampleSolution}
          </p>
          {checklist.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {checklist.map((item, i) => (
                <li key={item}>
                  <label className="flex items-start gap-2 text-sm text-[var(--color-text-primary)]">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={Boolean(checks[i])}
                      onChange={(e) =>
                        setChecks((c) => ({ ...c, [i]: e.target.checked }))
                      }
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => {
              const all =
                checklist.length === 0 ||
                checklist.every((_, i) => checks[i]);
              onChecked({ correct: all, selfChecked: true });
            }}
          >
            Selbstkontrolle speichern
          </Button>
        </div>
      )}
    </div>
  );
}

function shuffleStable<T>(items: T[], salt: string): T[] {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < salt.length; i++) h = (h * 31 + salt.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
