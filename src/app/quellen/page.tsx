import Link from "next/link";
import { MobileShell } from "@/components/learner/mobile-shell";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

/** Quellen je Einheit mit Abrufdatum (SIN-408). Nur amtliche Quellen; jede Einheit speichert URL und Abrufdatum. */
export default function QuellenPage() {
  const lernfeld = mafSeedLernfeldSicherheit();
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-4 px-6 pb-8 pt-12">
        <Link
          href="/einstellungen"
          className={`inline-flex min-h-11 items-center self-start text-sm text-[var(--color-brand-primary)] underline underline-offset-4 ${focusRing}`}
        >
          Zurück zu den Einstellungen
        </Link>
        <h1
          className="text-[28px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Quellen
        </h1>
        <p className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
          Jede Einheit stützt sich auf eine amtliche Quelle. Hier siehst du die
          Quelle und das Datum, an dem sie abgerufen wurde. Gezeigt wird das
          Lernfeld „{lernfeld.title}“.
        </p>
        <ul className="flex flex-col gap-2">
          {lernfeld.units.map((u) => (
            <li key={u.id} className="bento-tile !gap-1">
              <p className="bento-label">Einheit · {u.title}</p>
              <a
                href={u.sourceUrl}
                rel="noopener noreferrer"
                className={`inline-flex min-h-11 items-center break-all text-[15px] font-medium text-[var(--color-brand-primary)] underline underline-offset-2 ${focusRing}`}
              >
                {u.sourceUrl}
              </a>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Abgerufen am{" "}
                <time dateTime={u.sourceFetchedAt}>{formatDate(u.sourceFetchedAt)}</time>
              </p>
            </li>
          ))}
        </ul>
      </main>
    </MobileShell>
  );
}
