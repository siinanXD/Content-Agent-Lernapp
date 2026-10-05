"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * App Router root error boundary — reports to Sentry when DSN is set.
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
export default function GlobalError({
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
    <html lang="de">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-[var(--color-bg-canvas,#fafaf9)] px-6 py-16 text-[var(--color-text-primary,#1c1917)]">
        <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
        <p className="max-w-md text-center text-[15px] text-[var(--color-text-secondary,#57534e)]">
          Die Seite konnte nicht geladen werden. Du kannst es erneut versuchen.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-11 rounded-md bg-[var(--color-brand-primary,#C2410C)] px-4 text-sm font-medium text-white"
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
