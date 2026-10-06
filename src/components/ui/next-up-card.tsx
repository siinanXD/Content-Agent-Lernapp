import Link from "next/link";

/**
 * Hauptkachel „Als Nächstes“ (Figma 52:377, Variante 2026): dunkle Kachel mit genau einer Aktion.
 * Knopf: dunkler Text auf brand-accent (weißer Text nur auf brand-primary, AGENTS.md).
 */
export function NextUpCard({
  indexLabel,
  title,
  minutes,
  note,
  href,
}: {
  indexLabel: string;
  title: string;
  minutes: number;
  /** Ein ruhiger Satz unter dem Titel, z. B. wie weit das Tagesziel danach ist */
  note?: string;
  href: string;
}) {
  return (
    <section
      aria-label="Als Nächstes"
      className="flex flex-col gap-3.5 rounded-[var(--radius-xl)] bg-[var(--color-bg-hero)] p-5 sm:p-[var(--space-32)]"
    >
      <div className="mono-label flex items-center justify-between gap-2">
        <p className="text-[var(--color-accent-on-dark)]">Als Nächstes · {minutes} Min</p>
        <p className="text-[var(--color-text-muted-on-dark)]">{indexLabel}</p>
      </div>
      <h2
        className="text-[28px] font-bold leading-[1.05] text-[var(--color-text-on-brand)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {note ? (
        <p className="text-sm leading-[1.3] text-[var(--color-text-soft-on-dark)]">{note}</p>
      ) : null}
      <Link
        href={href}
        className="mt-1 flex min-h-[51px] items-center justify-between rounded-[14px] bg-[var(--color-brand-accent)] px-[18px] text-base font-semibold text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Einheit starten
        <span aria-hidden="true" className="text-lg">
          →
        </span>
      </Link>
    </section>
  );
}
