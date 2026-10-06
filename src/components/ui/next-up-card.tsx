import Link from "next/link";

/**
 * NextUpCard (Figma, Stil E): dunkle Karte „Als Nächstes“ mit Frage-Vorschau
 * und Start-Knopf. Text auf Hero hell (Token text-on-brand, ≥ 4,5:1),
 * Knopf weißer Text auf brand-primary.
 */
export function NextUpCard({
  indexLabel,
  title,
  minutes,
  preview,
  href,
}: {
  indexLabel: string;
  title: string;
  minutes: number;
  preview?: string;
  href: string;
}) {
  return (
    <section
      aria-label="Als Nächstes"
      className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] bg-[var(--color-bg-hero)] p-[18px]"
    >
      <div className="flex items-center justify-between gap-2 text-[var(--color-text-on-brand)]">
        <p
          className="text-[11px] font-medium uppercase tracking-wide"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Als Nächstes · {indexLabel}
        </p>
        <p className="text-xs">{minutes} Min</p>
      </div>
      <h2 className="text-[22px] font-bold leading-[1.3] text-[var(--color-text-on-brand)]">
        {title}
      </h2>
      {preview ? (
        <p className="line-clamp-2 text-sm leading-[1.3] text-[var(--color-text-on-brand)]">
          {preview}
        </p>
      ) : null}
      <Link
        href={href}
        className="mt-1 flex min-h-[50px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-4 text-base font-semibold text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-on-brand)]"
      >
        Einheit starten
      </Link>
    </section>
  );
}
