/** Hostname einer http(s)-Adresse, sonst null. Per URL-Parsing geprüft, nie per Teilstring. */
function webHost(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.hostname.replace(/^www\./, "")
      : null;
  } catch {
    return null;
  }
}

/**
 * Quellen-Chip (Regeln 2026 §4): Pille mit der amtlichen Quelle, Label in Geist Mono.
 * Ist die Quelle eine Webadresse, ist der Chip ein Link (Ziel ≥ 44 px), sonst reiner Text.
 */
export function SourceChip({ source }: { source: string }) {
  const text = source.replace(/^Quelle:\s*/, "").trim();
  if (!text) return null;
  const host = webHost(text);
  const base =
    "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2";
  const label = (
    <>
      <span
        className="shrink-0 text-xs font-medium tracking-[0.06em] text-[var(--color-text-secondary)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Quelle
      </span>
      <span className="min-w-0 break-words text-[15px] text-[var(--color-text-primary)]">
        {host ?? text}
      </span>
    </>
  );
  if (host) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]`}
        aria-label={`Quelle ${host} (öffnet in neuem Tab)`}
        data-testid="source-chip"
      >
        {label}
      </a>
    );
  }
  return (
    <p className={base} data-testid="source-chip">
      {label}
    </p>
  );
}
