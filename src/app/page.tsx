import type { Metadata } from "next";
import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";

export const metadata: Metadata = {
  title: "Lernpfad MAF für Bildungsträger",
  description:
    "Prüfungsreif in kleinen Schritten: Fragen aus Ausbildungsordnung und Rahmenlehrplan, mit Quelle. Demo-Zugang für Bildungsträger.",
};

const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-semibold text-[var(--color-text-on-brand)] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

const LEISTUNGEN = [
  {
    title: "Alle fünf MAF-Schwerpunkte",
    text: "Metall, Druck, Textil, Veredelung, Lebensmittel",
  },
  { title: "Gruppenübersicht", text: "Wer wo steht, ohne KI-Bewertung" },
  { title: "Läuft auf alten Handys", text: "auch offline" },
  { title: "Lizenz pro Teilnehmenden", text: "Preis auf Anfrage" },
];

/** Screen 18 Startseite · Bildungsträger. Statisch gerendert, die Scroll-Story läuft nur per CSS. */
export default function StartseitePage() {
  return (
    <MobileShell>
      <header className="flex items-center justify-between px-[22px] pt-[18px]">
        <p
          className="text-base font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lernpfad MAF
        </p>
        <Link
          href="/anmelden"
          className={`inline-flex min-h-11 items-center text-[15px] font-medium ${focusRing}`}
        >
          Anmelden
        </Link>
      </header>

      <main className="flex flex-col">
        <section
          className="flex flex-col gap-[18px] px-[22px] pb-10 pt-7"
          aria-labelledby="start-titel"
        >
          <h1
            id="start-titel"
            className="text-[44px] font-bold leading-[44px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Prüfungsreif in kleinen Schritten.
          </h1>
          <p className="text-base leading-[22px] text-[var(--color-text-secondary)]">
            Ihre Teilnehmenden lernen täglich 5–10 Minuten für die
            Abschlussprüfung Maschinen- und Anlagenführer. Jede Frage ist aus
            Ausbildungsordnung und Rahmenlehrplan abgeleitet und zeigt ihre
            Quelle.
          </p>
          <div className="flex flex-col items-start gap-3.5">
            <Link href="/demo" className={buttonPrimary}>
              Demo-Zugang anfragen
            </Link>
            <a
              href="#story"
              className={`inline-flex min-h-11 items-center text-[15px] font-medium underline underline-offset-4 ${focusRing}`}
            >
              So entsteht eine Frage
            </a>
          </div>
          <p
            className="pt-3.5 text-xs leading-[15.6px] text-[var(--color-text-secondary)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Grundlage: MaschAnlFAusbV und KMK-Rahmenlehrplan. Keine kopierten
            IHK-Aufgaben.
          </p>
        </section>

        <section id="story" className="story" aria-label="So entsteht eine Frage">
          <div className="story-stage flex flex-col gap-7 px-[22px] py-9">
            <Schritt
              nr={1}
              titel="1. Es beginnt beim Gesetzestext."
              text="Die App liest die Ausbildungsordnung und markiert, was in der Prüfung verlangt wird."
              kennung="§ 4 Ausbildungsrahmenplan"
              karte="Gefährdungen an elektrischen Anlagen erkennen und Maßnahmen zur Vermeidung ergreifen …"
            />
            <Schritt
              nr={2}
              titel="2. Daraus wird eine Frage."
              text="Kurz, eindeutig, mit genau einer richtigen Antwort. Ein zweites Modell prüft sie gegen die Quelle."
              kennung="M0 · 03 · Frage 1 von 6"
              karte="Was ist der erste Schritt vor dem Öffnen eines Schaltschranks?"
            />
            <Schritt
              nr={3}
              titel="3. Jede Antwort zeigt, woher sie kommt."
              text="Lernende sehen sofort, ob es stimmt, und wo es steht."
              kennung="Richtig: Freischalten"
              karte="Quelle: MaschAnlFAusbV, Ausbildungsrahmenplan · abgerufen 05.10.2026"
            />
            <Schritt
              nr={4}
              titel="4. Fehler kommen wieder."
              text="Falsch beantwortete Fragen tauchen nach 1, 3 und 7 Tagen erneut auf."
              kennung="Wiederholung"
              karte="Di · Do · Di der Folgewoche"
              balken
            />
          </div>
        </section>

        <section
          className="flex flex-col px-[22px] pb-10 pt-10"
          aria-labelledby="leistungen-titel"
        >
          <h2
            id="leistungen-titel"
            className="pb-3 text-[28px] font-bold leading-[29px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Was Sie als Bildungsträger bekommen
          </h2>
          <ul className="flex flex-col">
            {LEISTUNGEN.map((l) => (
              <li
                key={l.title}
                className="flex flex-col gap-0.5 border-t border-[var(--color-border-subtle)] py-3.5"
              >
                <span
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {l.title}
                </span>
                <span className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
                  {l.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="flex flex-col gap-[18px] bg-[var(--color-bg-hero)] px-[22px] pb-12 pt-12"
          aria-labelledby="abschluss-titel"
        >
          <h2
            id="abschluss-titel"
            className="text-[34px] font-bold leading-[44px] text-[var(--color-text-on-brand)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Testen Sie es mit einer Gruppe.
          </h2>
          <p className="text-base leading-[21px] text-[var(--color-text-muted-on-dark)]">
            Wir richten einen Demo-Zugang für bis zu 10 Teilnehmende ein. Sie
            sehen nach zwei Wochen, wer wie weit ist.
          </p>
          <Link href="/demo" className={`${buttonPrimary} self-start`}>
            Demo-Zugang anfragen
          </Link>
        </section>
      </main>

      <footer className="flex flex-wrap gap-x-[18px] px-[22px] py-2 text-sm text-[var(--color-text-secondary)]">
        <FooterLink href="/impressum">Impressum</FooterLink>
        <FooterLink href="/datenschutz">Datenschutz</FooterLink>
        <FooterLink href="/ki-hinweis">Hinweis zu KI-Inhalten</FooterLink>
      </footer>
    </MobileShell>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center ${focusRing}`}
    >
      {children}
    </Link>
  );
}

function Schritt({
  nr,
  titel,
  text,
  kennung,
  karte,
  balken = false,
}: {
  nr: 1 | 2 | 3 | 4;
  titel: string;
  text: string;
  kennung: string;
  karte: string;
  balken?: boolean;
}) {
  return (
    <article className={`story-step story-step-${nr} flex flex-col gap-2.5`}>
      <h2
        className="text-[26px] font-bold leading-[34px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {titel}
      </h2>
      <p className="text-base leading-[21px] text-[var(--color-text-secondary)]">
        {text}
      </p>
      <div className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
        <p
          className="text-xs leading-4 text-[var(--color-text-secondary)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {kennung}
        </p>
        <p
          className="text-[15px] font-semibold leading-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {karte}
        </p>
        {balken ? (
          <div
            className="mt-1 h-1 w-full overflow-hidden rounded-[4px] bg-[var(--color-border-subtle)]"
            aria-hidden="true"
          >
            <div className="story-bar-fill h-1 w-3/4 rounded-[4px] bg-[var(--color-brand-primary)]" />
          </div>
        ) : null}
      </div>
    </article>
  );
}
