import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";

/** Screen 00 Onboarding · Willkommen (Figma 20:312) */
export default function WillkommenPage() {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col justify-end gap-4 bg-gradient-to-br from-[var(--color-bg-hero)] to-[var(--color-brand-primary)] px-7 pb-10 pt-24">
          <h1
            className="text-[34px] font-bold leading-10 text-[var(--color-text-on-brand)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Willkommen
          </h1>
          <p
            className="text-xl font-medium leading-7 text-[var(--color-text-on-brand)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Lernen für den Maschinen- und Anlagenführer, in kurzen Einheiten.
          </p>
          <p className="text-[15px] leading-[22px] text-[#d6d4d1]">
            Alle Inhalte stammen aus amtlichen Quellen. Die App erzeugt Inhalte
            mit KI. Wer bewertet und zur Prüfung zulässt, ist immer ein Mensch.
          </p>
        </section>
        <section className="flex flex-col gap-3 px-6 py-6">
          <Link
            href="/einwilligung"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-medium text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Los geht’s
          </Link>
        </section>
      </main>
    </MobileShell>
  );
}
