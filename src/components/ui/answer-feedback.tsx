import type { ReactNode } from "react";
import { CheckIcon, CrossIcon } from "@/components/ui/icons";
import { SourceChip } from "@/components/ui/source-chip";

/**
 * AnswerFeedback (Figma 16:153): Richtig/Falsch direkt nach jeder Antwort.
 * Icon, Titel, richtige Antwort (nur bei „falsch“), Erklärung, Quelle, Weiter-Button.
 * Farbe allein trägt nie die Information: Icon und Titel sagen es auch.
 */
export function AnswerFeedback({
  correct,
  correctAnswer,
  explanation,
  source,
  children,
}: {
  correct: boolean;
  correctAnswer?: string;
  explanation: string;
  source?: string;
  /** Weiter-Button */
  children: ReactNode;
}) {
  const tone = correct
    ? "var(--color-feedback-success)"
    : "var(--color-feedback-danger)";
  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border-2 bg-[var(--color-bg-surface)] px-5 py-5"
      style={{ borderColor: tone }}
      data-testid="answer-feedback"
      data-correct={correct}
    >
      <div className="flex flex-col gap-2">
        <p className="mono-label" style={{ color: tone }} aria-hidden="true">
          {correct ? "RICHTIG" : "FALSCH"}
        </p>
        <div className="flex items-center gap-2.5" style={{ color: tone }}>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-white"
            style={{ backgroundColor: tone }}
          >
            {correct ? <CheckIcon /> : <CrossIcon />}
          </span>
          <p
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {correct ? "Richtig" : "Nicht ganz"}
          </p>
        </div>
        {!correct && correctAnswer ? (
          <p className="text-[15px] text-[var(--color-text-primary)]">
            <span className="font-medium">Richtige Antwort: </span>
            {correctAnswer}
          </p>
        ) : null}
        <p className="text-[15px] leading-6 text-[var(--color-text-primary)]">
          {explanation}
        </p>
        {source ? (
          <div>
            <SourceChip source={source} />
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
