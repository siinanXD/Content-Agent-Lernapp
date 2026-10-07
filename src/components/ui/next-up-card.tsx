import Link from "next/link";

/**
 * NextUpCard (Variante 2026, A1): Hauptkachel „Als Nächstes“ mit genau einer Aktion.
 * Dunkle Fläche (`bento-main`), Text hell (Token text-on-brand, ≥ 4,5:1),
 * Knopf weißer Text auf brand-primary.
 */
export function NextUpCard({
  indexLabel,
  title,
  minutes,
  preview,
  href,
  className = "",
}: {
  indexLabel: string;
  title: string;
  minutes: number;
  preview?: string;
  href: string;
  className?: string;
}) {
  return (
    <section aria-label="Als Nächstes" className={`bento-tile bento-main ${className}`}>
      <p className="bento-label">
        Als Nächstes · {indexLabel} · {minutes} Min
      </p>
      <h2
        className="text-[28px] font-bold leading-9 text-[var(--color-text-on-brand)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {preview ? (
        <p className="line-clamp-2 text-[15px] leading-6 text-[var(--color-text-soft-on-dark)]">
          {preview}
        </p>
      ) : null}
      <Link
        href={href}
        className="mt-2 flex min-h-[50px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-4 text-base font-semibold text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
      >
        Einheit starten
      </Link>
    </section>
  );
}
