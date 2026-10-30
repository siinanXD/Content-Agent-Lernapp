import type { ReactNode } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";

export const authLink =
  "inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2";

/** Rahmen der Konto-Seiten (Anmelden, Registrieren, Passwort): gleiche Überschrift und Breite wie die Anmeldung davor. */
export function AuthSeite({ titel, intro, children }: { titel: string; intro?: string; children: ReactNode }) {
  return (
    <MobileShell wide>
      <main className="mx-auto flex w-full flex-col gap-4 px-4 pb-8 pt-10 md:max-w-[640px]">
        <h1
          className="text-[32px] font-bold leading-10 md:text-[44px] md:leading-[48px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {titel}
        </h1>
        {intro ? <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">{intro}</p> : null}
        {children}
      </main>
    </MobileShell>
  );
}

export function Hinweis({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 text-[15px] leading-5"
    >
      {children}
    </p>
  );
}

export function Fehler({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-[var(--color-feedback-danger)]">
      {children}
    </p>
  );
}
