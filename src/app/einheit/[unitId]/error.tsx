"use client";

import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";
import { StateView } from "@/components/ui/state-view";

/** Screen 17 „Fehler“: Fehlerseite statt Absturz, wenn eine Einheit nicht rendert (SIN-249). */
export default function EinheitError({
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
      <main className="flex flex-1 flex-col gap-4 px-6 py-16">
        <h1 className="sr-only">Einheit</h1>
        <StateView
          kind="fehler"
          title="Die Einheit lässt sich nicht öffnen"
          text="Bitte versuche es noch einmal oder gehe zurück zum Lernpfad."
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="min-h-11 rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-4 text-sm font-medium text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Erneut versuchen
            </button>
            <Link
              href="/lernpfad"
              className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] px-4 text-sm font-medium text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Zum Lernpfad
            </Link>
          </div>
        </StateView>
      </main>
    </MobileShell>
  );
}
