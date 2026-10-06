import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]";

/** W1 Willkommen (Figma 56:369, Variante 2026): große Schlagzeile statt Hero-Bild, eine Aktion. */
export default function WillkommenPage() {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-3.5 bg-[var(--color-bg-hero)] px-4 pb-6 pt-11">
        <p className="mono-label uppercase text-[var(--color-accent-on-dark)]">
          Lernpfad MAF
        </p>
        <div className="flex-1" aria-hidden="true" />
        <h1
          className="text-[52px] font-bold leading-[0.96] text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Prüfungsreif in kleinen Schritten.
        </h1>
        <p className="text-base leading-[1.3] text-[var(--color-text-soft-on-dark)]">
          5–10 Minuten am Tag. Jede Frage mit Quelle aus der Ausbildungsordnung.
        </p>
        <p className="text-sm leading-[1.3] text-[var(--color-text-muted-on-dark)]">
          Inhalte erzeugt eine KI aus amtlichen Quellen. Wer bewertet und zur
          Prüfung zulässt, ist immer ein Mensch.
        </p>
        <div className="flex items-center gap-1.5" role="img" aria-label="Schritt 1 von 3">
          <span className="h-2 w-6 rounded-full bg-[var(--color-brand-accent)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--color-track-on-dark)]" />
          <span className="h-2 w-2 rounded-full bg-[var(--color-track-on-dark)]" />
        </div>
        <Link
          href="/einwilligung"
          className={`flex min-h-[53px] items-center rounded-[var(--radius-lg)] bg-[var(--color-brand-primary)] px-[18px] text-base font-semibold text-[var(--color-text-on-brand)] ${focus}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Los geht’s
        </Link>
        <p className="text-sm font-medium text-[var(--color-text-muted-on-dark)]">
          Schon dabei?{" "}
          <Link
            href="/anmelden"
            className={`inline-flex min-h-11 items-center text-[var(--color-text-soft-on-dark)] underline underline-offset-4 ${focus}`}
          >
            Anmelden
          </Link>
        </p>
      </main>
    </MobileShell>
  );
}
