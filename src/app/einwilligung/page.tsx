"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/learner/mobile-shell";
import { saveOnboarding } from "@/lib/learner/onboarding";

const tile =
  "flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4";
const tileLabel = "mono-label uppercase text-[var(--color-text-secondary)]";
const tileText = "text-[15px] font-medium leading-[19.5px] text-[var(--color-text-primary)]";
const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/**
 * W2 Einwilligung (Figma 56:381, Variante 2026): drei Kacheln Was wir messen / Was nie / Wofür,
 * zwei gleichwertige Knöpfe. Abweichung: Kachel „Quellen und KI“ (vom entfallenen W1) und der Link
 * „Datenschutz“ bleiben, damit der KI-Hinweis und die Informationspflicht vor der Entscheidung gelten.
 */
export default function EinwilligungPage() {
  const router = useRouter();

  function decide(consent: boolean) {
    saveOnboarding({ consent });
    router.push("/beruf");
  }

  return (
    <MobileShell wide>
      <main className="flex flex-1 flex-col gap-3.5 bg-[var(--color-bg-canvas)] px-4 pb-6 pt-11 md:px-12">
        <header className="flex flex-col gap-3">
          <p className="bento-label uppercase">Schritt 2 von 4</p>
          <h1
            className="text-[30px] font-bold leading-[31.5px] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dürfen wir anonym messen, was hilft?
          </h1>
        </header>

        <div className="flex flex-col gap-2.5">
          <section className={tile} aria-labelledby="einw-messen">
            <h2 id="einw-messen" className={tileLabel}>
              Was wir messen
            </h2>
            <p className={tileText}>Richtig/falsch, Dauer, Abbrüche – mit Zufalls-Kennung</p>
          </section>

          <section className={`${tile} border-[var(--color-bg-hint)] bg-[var(--color-bg-hint)]`} aria-labelledby="einw-nie">
            <h2 id="einw-nie" className="mono-label uppercase text-[var(--color-text-hint)]">
              Was nie
            </h2>
            <p className="text-[15px] font-medium leading-[19.5px] text-[var(--color-text-hint)]">
              Name, E-Mail, Bewertung deiner Person
            </p>
          </section>

          <section className={tile} aria-labelledby="einw-wofuer">
            <h2 id="einw-wofuer" className={tileLabel}>
              Wofür
            </h2>
            <p className={tileText}>Zu schwere Fragen und zu lange Einheiten finden</p>
          </section>

          <section className={tile} aria-labelledby="einw-ki">
            <h2 id="einw-ki" className={tileLabel}>
              Quellen und KI
            </h2>
            <p className="text-sm leading-5 text-[var(--color-text-primary)]">
              Alle Inhalte stammen aus amtlichen Quellen. Die App erzeugt Inhalte mit KI. Wer
              bewertet und zur Prüfung zulässt, ist immer ein Mensch.
            </p>
          </section>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 md:flex-row">
            <button
              type="button"
              onClick={() => decide(true)}
              className={`flex min-h-[55px] flex-1 items-center justify-center rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-4 text-base font-semibold text-[var(--color-text-primary)] ${focus}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              Einverstanden
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              className={`flex min-h-[55px] flex-1 items-center justify-center rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] px-3 py-4 text-base font-semibold text-[var(--color-text-primary)] ${focus}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ablehnen
            </button>
          </div>
          <p className="text-xs leading-4 text-[var(--color-text-secondary)]">
            Jederzeit änderbar in Einstellungen. Die App funktioniert auch ohne.
          </p>
          <Link
            href="/datenschutz"
            className={`inline-flex min-h-11 items-center self-start text-sm text-[var(--color-brand-primary)] underline underline-offset-4 ${focus}`}
          >
            Datenschutz
          </Link>
        </div>
      </main>
    </MobileShell>
  );
}
