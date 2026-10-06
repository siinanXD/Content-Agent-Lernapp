"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/learner/mobile-shell";
import { saveOnboarding } from "@/lib/learner/onboarding";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Beide Knöpfe teilen diese Klasse: gleich groß, gleich sichtbar (kein Druck zur Zustimmung). */
const choiceClass = `flex min-h-[55px] flex-1 items-center justify-center rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-base font-semibold text-[var(--color-text-primary)] ${focus}`;

const tiles = [
  {
    label: "Was wir messen",
    text: "Richtig/falsch, Dauer, Abbrüche – mit Zufalls-Kennung",
    hint: false,
  },
  { label: "Was nie", text: "Name, E-Mail, Bewertung deiner Person", hint: true },
  {
    label: "Wofür",
    text: "Zu schwere Fragen und zu lange Einheiten finden",
    hint: false,
  },
];

/** W2 Einwilligung (Figma 56:381, Variante 2026): drei Kacheln, zwei gleichwertige Knöpfe. */
export default function EinwilligungPage() {
  const router = useRouter();

  function decide(consent: boolean) {
    saveOnboarding({ consent });
    router.push("/schwerpunkt");
  }

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-11">
        <p className="mono-label uppercase text-[var(--color-text-secondary)]">
          Schritt 2 von 3
        </p>
        <h1
          className="text-[30px] font-bold leading-[1.05] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dürfen wir anonym messen, was hilft?
        </h1>

        <ul className="flex flex-col gap-[var(--bento-gap)]">
          {tiles.map((t) => (
            <li
              key={t.label}
              className={`flex flex-col gap-2 rounded-[20px] p-4 ${
                t.hint
                  ? "bg-[var(--color-bg-hint)] text-[var(--color-text-hint)]"
                  : "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
              }`}
            >
              <h2
                className={`mono-label uppercase ${
                  t.hint ? "" : "text-[var(--color-text-secondary)]"
                }`}
              >
                {t.label}
              </h2>
              <p className="text-[15px] font-medium leading-[1.3]">{t.text}</p>
            </li>
          ))}
        </ul>

        <div className="flex-1" />

        <div className="flex gap-[var(--bento-gap)]">
          <button type="button" className={choiceClass} onClick={() => decide(true)}>
            Einverstanden
          </button>
          <button type="button" className={choiceClass} onClick={() => decide(false)}>
            Ablehnen
          </button>
        </div>
        <p className="text-xs leading-[1.3] text-[var(--color-text-secondary)]">
          Jederzeit änderbar in Einstellungen. Die App funktioniert auch ohne.
          Die KI erzeugt nur Inhalte aus amtlichen Quellen; Bewertung und Zulassung
          machen Menschen.
        </p>
        <div className="flex gap-6 text-xs">
          <Link
            href="/datenschutz"
            className={`inline-flex min-h-11 items-center text-[var(--color-brand-primary)] underline underline-offset-4 ${focus}`}
          >
            Datenschutz
          </Link>
          <Link
            href="/ki-hinweis"
            className={`inline-flex min-h-11 items-center text-[var(--color-brand-primary)] underline underline-offset-4 ${focus}`}
          >
            Hinweis zur KI
          </Link>
        </div>
      </main>
    </MobileShell>
  );
}
