import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";

/**
 * W1 Willkommen (Figma 56:369, Variante 2026): dunkle Fläche, drei Zeilen Schlagzeile, eine Hauptaktion.
 * Der KI-Hinweis steht auf W2 (Einwilligung), nicht hier.
 */
export default function WillkommenPage() {
  return (
    <MobileShell wide>
      <main className="flex flex-1 flex-col gap-3.5 bg-[var(--color-bg-hero)] px-4 pb-6 pt-11 md:px-12">
        <p className="mono-label text-[var(--color-text-soft-on-dark)]">LERNPFAD MAF</p>

        <div className="mt-auto flex flex-col gap-3.5">
          <h1
            className="text-[52px] font-bold leading-[50px] text-[var(--color-text-on-brand)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Prüfungsreif
            <br />
            in kleinen
            <br />
            Schritten.
          </h1>
          <p className="text-base leading-[21px] text-[var(--color-text-soft-on-dark)]">
            5–10 Minuten am Tag. Jede Frage mit Quelle aus der Ausbildungsordnung.
          </p>

          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2 w-6 rounded-full bg-[var(--color-brand-accent)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--color-track-on-dark)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--color-track-on-dark)]" />
          </div>

          <Link
            href="/einwilligung"
            className="flex min-h-[53px] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-primary)] px-[18px] py-4 text-base font-semibold text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Los geht’s
          </Link>
          <p className="text-sm leading-[18px] text-[var(--color-text-muted-on-dark)]">
            Schon dabei?{" "}
            <Link
              href="/anmelden"
              className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
            >
              Anmelden
            </Link>
          </p>
        </div>
      </main>
    </MobileShell>
  );
}
