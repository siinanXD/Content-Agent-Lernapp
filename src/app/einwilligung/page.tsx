"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/learner/mobile-shell";
import { saveOnboarding } from "@/lib/learner/onboarding";

/** W2 Einwilligung (Variante 2026): zwei Kacheln, beide Knöpfe gleichwertig (gleiche Form, Größe und Farbe). */
export default function EinwilligungPage() {
  const router = useRouter();

  function decide(consent: boolean) {
    saveOnboarding({ consent });
    router.push("/beruf");
  }

  return (
    <MobileShell wide>
      <main className="flex flex-1 flex-col gap-6 px-6 pb-8 pt-14 md:px-12">
        <header>
          <p className="bento-label">Schritt 2 von 4</p>
          <h1
            className="mt-2 text-[40px] font-bold leading-[44px] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Einwilligung
          </h1>
        </header>

        <div className="bento">
          <section className="bento-tile bento-span-3">
            <p className="bento-label">KI</p>
            <h2
              className="text-lg font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Hinweis zur KI
            </h2>
            <p className="text-[15px] leading-6 text-[var(--color-text-primary)]">
              Erklärungen und Fragen werden mit KI aus amtlichen Quellen erzeugt.
              Jede Einheit nennt ihre Quelle. Die KI bewertet dich nicht; über
              Bewertung und Zulassung entscheidet ein Mensch.
            </p>
          </section>

          <section className="bento-tile bento-span-3">
            <p className="bento-label">Daten</p>
            <h2
              className="text-lg font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Nutzungsdaten
            </h2>
            <p className="text-[15px] leading-6 text-[var(--color-text-primary)]">
              Wenn du einwilligst, speichern wir, welche Einheiten du öffnest und
              wie du antwortest, um die App zu verbessern. Ohne Einwilligung
              werden keine Nutzungsdaten gespeichert; du kannst trotzdem alles
              lernen. Du kannst das jederzeit in den Einstellungen ändern.
            </p>
            <Link
              href="/datenschutz"
              className="inline-flex min-h-11 items-center self-start text-sm text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Datenschutz
            </Link>
          </section>
        </div>

        <div className="mt-auto flex flex-col gap-3 md:flex-row">
          <Button variant="secondary" onClick={() => decide(true)}>
            Einverstanden
          </Button>
          <Button variant="secondary" onClick={() => decide(false)}>
            Ohne Nutzungsdaten weiter
          </Button>
        </div>
      </main>
    </MobileShell>
  );
}
