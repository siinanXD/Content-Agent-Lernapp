import Link from "next/link";

/**
 * NextUpCard (Variante 2026, A1, Figma 52:377): Hauptkachel „Als Nächstes“ mit genau einer Aktion.
 * Dunkle Fläche (`bento-main`), Text hell (Token text-on-brand, ≥ 4,5:1). Der Knopf liegt auf
 * brand-accent und trägt dunklen Text (AGENTS.md: weißer Text nur auf brand-primary).
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
      <div className="flex items-center justify-between gap-3">
        <p className="bento-label">Als Nächstes · {minutes} Min</p>
        <p className="mono-label text-[var(--color-text-muted-on-dark)]">{indexLabel}</p>
      </div>
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
        className="mt-2 flex min-h-[50px] items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-brand-accent)] px-4 text-base font-semibold text-[var(--color-bg-hero)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
      >
        Einheit starten
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
