import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";

/** W1 Willkommen (Variante 2026): große Schlagzeile, eine Hauptaktion, Hinweis zur KI als zweite Kachel. */
export default function WillkommenPage() {
  return (
    <MobileShell wide>
      <main className="flex flex-1 flex-col justify-center px-6 py-12 md:px-12">
        <div className="bento">
          <section className="bento-tile bento-main bento-span-4 justify-end md:min-h-[360px]">
            <p className="bento-label">Willkommen</p>
            <h1
              className="text-[40px] font-bold leading-[44px] text-[var(--color-text-on-brand)] md:text-[56px] md:leading-[60px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Lernen für den Maschinen- und Anlagenführer, in kurzen Einheiten.
            </h1>
            <Link
              href="/einwilligung"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-medium text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)] md:w-auto md:self-start"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Los geht’s
            </Link>
          </section>
          <section className="bento-tile bento-span-2 justify-end" aria-label="Hinweis zur KI">
            <p className="bento-label">Quellen und KI</p>
            <p className="text-[15px] leading-6 text-[var(--color-text-primary)]">
              Alle Inhalte stammen aus amtlichen Quellen. Die App erzeugt Inhalte
              mit KI. Wer bewertet und zur Prüfung zulässt, ist immer ein Mensch.
            </p>
          </section>
        </div>
      </main>
    </MobileShell>
  );
}
