import type { Metadata } from "next";
import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";
import { FAQ, organisationSchema, faqSchema } from "@/lib/seo/startseite";

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

/** Variante 2026 (A3): große Schlagzeile mit einer Aktion, Bento-Beweis, darunter die Scroll-Story. Statisch gerendert, die Story läuft nur per CSS. */
export default function StartseitePage() {
  return (
    <MobileShell wide>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organisationSchema(), faqSchema()]),
        }}
      />
      <header className="flex items-center justify-between px-[22px] pt-[18px] md:px-8">
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
          className="bento px-4 pb-10 pt-6 md:px-8 md:pt-8"
          aria-labelledby="start-titel"
        >
          <div className="bento-tile bento-main md:col-span-6">
            <p className="bento-label">Für Bildungsträger · Maschinen- und Anlagenführer</p>
            <h1
              id="start-titel"
              className="text-[44px] font-bold leading-[44px] tracking-tight md:text-[80px] md:leading-[80px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Prüfungsreif in kleinen Schritten.
            </h1>
            <p className="max-w-[640px] text-base leading-[22px] text-[var(--color-text-soft-on-dark)] md:text-lg md:leading-7">
              Ihre Teilnehmenden lernen täglich 5–10 Minuten für die
              Abschlussprüfung. Jede Frage ist aus Ausbildungsordnung und
              Rahmenlehrplan abgeleitet und zeigt ihre Quelle.
            </p>
            <Link href="/demo" className={`${buttonPrimary} self-start`}>
              Demo-Zugang anfragen
            </Link>
          </div>

          <Beweis
            span="md:col-span-2"
            label="Quelle"
            titel="Jede Frage zeigt, woher sie kommt."
            text="Ausbildungsordnung und KMK-Rahmenlehrplan, mit Abrufdatum."
          />
          <Beweis
            span="md:col-span-2"
            label="Wiederholung · 1 · 3 · 7 Tage"
            titel="Fehler kommen wieder."
            text="Falsch beantwortete Fragen tauchen nach 1, 3 und 7 Tagen erneut auf."
          />
          <Beweis
            span="md:col-span-2"
            label="Prüfung"
            titel="Keine kopierten IHK-Aufgaben."
            text="Grundlage: MaschAnlFAusbV und KMK-Rahmenlehrplan."
          />
          <Beweis
            span="md:col-span-3"
            label="Gruppe"
            titel="Wer wo steht, ohne KI-Bewertung."
            text="Die App zeigt Fortschritt und Lernzeit. Entscheidungen treffen Sie."
          />
          <div className="bento-tile md:col-span-3">
            <p className="bento-label">Ablauf</p>
            <a
              href="#story"
              className={`inline-flex min-h-11 items-center text-lg font-semibold underline underline-offset-4 ${focusRing}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              So entsteht eine Frage
            </a>
            <p className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
              In vier Schritten vom Gesetzestext zur Antwort mit Quelle.
            </p>
          </div>
        </section>

        <section id="story" className="story" aria-label="So entsteht eine Frage">
          <div className="story-stage mx-auto flex w-full max-w-[720px] flex-col gap-7 px-[22px] py-9">
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
          className="flex flex-col px-[22px] pb-10 pt-10 md:px-8"
          aria-labelledby="leistungen-titel"
        >
          <h2
            id="leistungen-titel"
            className="pb-3 text-[28px] font-bold leading-[29px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Was Sie als Bildungsträger bekommen
          </h2>
          <ul className="bento">
            {LEISTUNGEN.map((l) => (
              <li key={l.title} className="bento-tile md:col-span-3">
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
          className="flex flex-col gap-4 px-[22px] pb-10 md:px-8"
          aria-labelledby="faq-titel"
        >
          <h2
            id="faq-titel"
            className="text-[28px] font-bold leading-[29px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Häufige Fragen
          </h2>
          <dl className="bento">
            {FAQ.map((f) => (
              <div key={f.frage} className="bento-tile md:col-span-3">
                <dt
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {f.frage}
                </dt>
                <dd className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
                  {f.antwort}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="mx-4 mb-4 flex flex-col gap-[18px] rounded-[var(--radius-xl)] bg-[var(--color-bg-hero)] px-6 pb-12 pt-12 md:mx-8 md:px-12"
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

      <footer className="flex flex-wrap gap-x-[18px] px-[22px] py-2 text-sm text-[var(--color-text-secondary)] md:px-8">
        <FooterLink href="/impressum">Impressum</FooterLink>
        <FooterLink href="/datenschutz">Datenschutz</FooterLink>
        <FooterLink href="/ki-hinweis">Hinweis zu KI-Inhalten</FooterLink>
      </footer>
    </MobileShell>
  );
}

function Beweis({
  span,
  label,
  titel,
  text,
}: {
  span: string;
  label: string;
  titel: string;
  text: string;
}) {
  return (
    <div className={`bento-tile ${span}`}>
      <p className="bento-label">{label}</p>
      <p
        className="text-lg font-semibold leading-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {titel}
      </p>
      <p className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
        {text}
      </p>
    </div>
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
      <div className="bento-tile !gap-1.5 !p-4">
        <p className="bento-label">{kennung}</p>
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
