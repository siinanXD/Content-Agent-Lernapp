"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/learner/mobile-shell";
import { saveOnboarding } from "@/lib/learner/onboarding";

/** Screen 00b Einwilligung mit KI-Hinweis (Figma 20:343) */
export default function EinwilligungPage() {
  const router = useRouter();

  function decide(consent: boolean) {
    saveOnboarding({ consent });
    router.push("/schwerpunkt");
  }

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-5 px-6 pb-8 pt-14">
        <h1
          className="text-[28px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Einwilligung
        </h1>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <h2
            className="text-base font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Hinweis zur KI
          </h2>
          <p className="mt-2 text-[15px] leading-6 text-[var(--color-text-primary)]">
            Erklärungen und Fragen werden mit KI aus amtlichen Quellen erzeugt.
            Jede Einheit nennt ihre Quelle. Die KI bewertet dich nicht; über
            Bewertung und Zulassung entscheidet ein Mensch.
          </p>
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <h2
            className="text-base font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nutzungsdaten
          </h2>
          <p className="mt-2 text-[15px] leading-6 text-[var(--color-text-primary)]">
            Wenn du einwilligst, speichern wir, welche Einheiten du öffnest und
            wie du antwortest, um die App zu verbessern. Ohne Einwilligung
            werden keine Nutzungsdaten gespeichert; du kannst trotzdem alles
            lernen. Du kannst das jederzeit in den Einstellungen ändern.
          </p>
          <p className="mt-2 text-sm">
            <Link
              href="/datenschutz"
              className="text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Datenschutz
            </Link>
          </p>
        </section>

        <div className="mt-auto flex flex-col gap-3">
          <Button onClick={() => decide(true)}>Einverstanden</Button>
          <Button variant="secondary" onClick={() => decide(false)}>
            Ohne Nutzungsdaten weiter
          </Button>
        </div>
      </main>
    </MobileShell>
  );
}
