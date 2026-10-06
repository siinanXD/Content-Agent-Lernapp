"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";
import { StateView } from "@/components/ui/state-view";

/** Zustand „Fehler“ (Figma W10/17): Fehlerseite statt Absturz, Fortschritt bleibt gespeichert. */
export default function LernpfadError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-3.5 px-4 pt-11">
        <h1 className="sr-only">Heute</h1>
        <StateView kind="fehler" text="Konnte nicht laden. Dein Fortschritt ist sicher.">
          <button
            type="button"
            onClick={() => reset()}
            className="flex min-h-11 items-center rounded-[var(--radius-md)] px-1 text-sm font-semibold text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Erneut versuchen →
          </button>
        </StateView>
      </main>
    </MobileShell>
  );
}
