"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * „Warum?“-Panel (Regeln 2026 §4): KI-Erklärung von unten, mit Quelle und Kennzeichnung.
 * Nicht modal: der Inhalt darüber bleibt sichtbar und lesbar. Esc oder „Schließen“ beendet es.
 * „KI-erklärt · geprüft“ steht nur, wenn eine Quelle vorliegt (ohne Quelle keine Erklärung).
 */
export function WhyPanel({
  explanation,
  simpleExplanation,
  source,
  readAloud,
  onClose,
  onReport,
}: {
  explanation: string;
  /** Einfachere Fassung, falls vorhanden; sonst entfällt der Knopf. */
  simpleExplanation?: string;
  source: string;
  readAloud: (text: string) => void;
  onClose: () => void;
  onReport: () => void;
}) {
  const [simple, setSimple] = useState(false);
  const [reported, setReported] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const text = simple && simpleExplanation ? simpleExplanation : explanation;

  useEffect(() => {
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="why-title"
      data-testid="why-panel"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-h-[60vh] w-full max-w-[480px] flex-col gap-3 overflow-y-auto rounded-t-[var(--radius-xl)] border border-b-0 border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-6 pb-6 pt-5 outline-none"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="why-title"
          className="text-lg font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Warum?
        </h2>
        <p className="mono-label text-[var(--color-text-secondary)]">
          KI-erklärt · geprüft
        </p>
      </div>
      <p className="text-[15px] leading-6 text-[var(--color-text-primary)]">
        {text}
      </p>
      <p className="break-words text-xs text-[var(--color-text-secondary)]">
        Quelle: {source}
      </p>
      <div className="flex flex-col gap-2">
        {simpleExplanation ? (
          <Button
            variant="secondary"
            aria-pressed={simple}
            onClick={() => setSimple((s) => !s)}
          >
            {simple ? "Normale Erklärung" : "Einfacher erklären"}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => readAloud(text)}>
          Vorlesen
        </Button>
        {reported ? (
          <p role="status" className="text-sm text-[var(--color-text-secondary)]">
            Gemeldet. Danke, ein Mensch schaut sich die Stelle an.
          </p>
        ) : (
          <Button
            variant="ghost"
            onClick={() => {
              setReported(true);
              onReport();
            }}
          >
            Passt nicht? Melden
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Schließen
        </Button>
      </div>
    </section>
  );
}
