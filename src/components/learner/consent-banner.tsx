"use client";

import Link from "next/link";
import { useState } from "react";
import { EMPTY_ONBOARDING, loadOnboarding, saveOnboarding } from "@/lib/learner/onboarding";
import { useAfterMount } from "@/lib/use-after-mount";

// Beide Knöpfe gleich: gleiche Form, Größe und Farbe (Figma N3 „Gleichwertig“).
const buttonClass =
  "flex min-h-[50px] flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-semibold text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]";

/**
 * Einwilligungs-Banner für Nutzungsdaten (Figma N3). Erscheint nur, solange
 * noch nicht entschieden wurde. Beide Knöpfe sind gleich groß und gleich sichtbar,
 * es gibt kein Vorab-Häkchen, und die App funktioniert ohne Zustimmung.
 */
export function ConsentBanner() {
  // Server-HTML enthält das Banner (SIN-311): sonst erscheint sein Text erst nach dem Laden der Skripte
  // und wird zum spätesten, größten Bildelement. Wer schon entschieden hat, bekommt es per Layout-Skript
  // vor dem ersten Bild ausgeblendet; nach dem Laden entfernt es dieser Code.
  const stored = useAfterMount(loadOnboarding, EMPTY_ONBOARDING);
  const [decided, setDecided] = useState(false);
  if (decided || stored.consent !== null) return null;

  function decide(consent: boolean) {
    saveOnboarding({ consent });
    setDecided(true);
  }

  return (
    <section
      data-consent-banner
      aria-labelledby="consent-banner-title"
      className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-[358px] flex-col gap-2.5 rounded-[var(--radius-xl)] bg-[var(--color-bg-hero)] p-6 text-[var(--color-text-on-brand)]"
    >
      <p className="mono-label text-[var(--color-text-muted-on-dark)]">Freiwillig</p>
      <h2
        id="consent-banner-title"
        className="text-lg font-bold leading-[23px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Dürfen wir anonym messen, was hilft?
      </h2>
      <p className="text-sm leading-[18px] text-[var(--color-text-soft-on-dark)]">
        Nur Klicks und Lernzeit, ohne Namen. Jederzeit in den Einstellungen änderbar.
      </p>
      <Link
        href="/datenschutz"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-text-on-brand)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
      >
        Details: Datenschutzerklärung
      </Link>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} onClick={() => decide(true)}>
          Ja, erlauben
        </button>
        <button type="button" className={buttonClass} onClick={() => decide(false)}>
          Nein, danke
        </button>
      </div>
    </section>
  );
}
