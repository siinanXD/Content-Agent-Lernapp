"use client";

import Link from "next/link";
import { useState } from "react";
import { EMPTY_ONBOARDING, loadOnboarding, saveOnboarding } from "@/lib/learner/onboarding";
import { useAfterMount } from "@/lib/use-after-mount";

const buttonClass =
  "flex min-h-[53px] flex-1 items-center justify-center rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-brand-primary)] bg-[var(--color-bg-surface)] px-5 text-base font-semibold text-[var(--color-brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/**
 * Einwilligungs-Banner für Nutzungsdaten (Figma Screen 25). Erscheint nur, solange
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
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-[390px] flex-col gap-3.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 pb-8 pt-6"
    >
      <h2
        id="consent-banner-title"
        className="text-xl font-bold leading-[26px] text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Dürfen wir anonym messen, wie die App genutzt wird?
      </h2>
      <p className="text-[15px] leading-6 text-[var(--color-text-secondary)]">
        Wir zählen zum Beispiel, wo Lernende abbrechen und welche Fragen zu
        schwer sind, damit die App besser wird. Ohne Namen, ohne Werbung, Server
        in der EU. Du kannst es jederzeit in den Einstellungen ändern.
      </p>
      <Link
        href="/datenschutz"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        Details: Datenschutzerklärung
      </Link>
      <div className="flex gap-2.5">
        <button type="button" className={buttonClass} onClick={() => decide(true)}>
          Einverstanden
        </button>
        <button type="button" className={buttonClass} onClick={() => decide(false)}>
          Ablehnen
        </button>
      </div>
    </section>
  );
}
