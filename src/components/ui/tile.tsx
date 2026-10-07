import type { ElementType, HTMLAttributes, ReactNode } from "react";

type Tone = "default" | "hero" | "hint";

const tones: Record<Tone, string> = {
  default:
    "border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-[var(--bento-pad)]",
  hero: "bg-[var(--color-bg-hero)] p-[var(--space-32)] text-[var(--color-text-on-brand)]",
  hint: "bg-[var(--color-bg-hint)] p-[var(--bento-pad)] text-[var(--color-text-hint)]",
};

/**
 * Bento-Kachel (Regeln 2026 §1): große Hauptkachel (`hero`) mit genau einer Aktion,
 * darunter kleinere Kacheln. Rundung `--radius-xl`, keine Karten in Karten.
 */
export function Tile({
  as: Tag = "section",
  tone = "default",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`flex flex-col gap-3 rounded-[var(--radius-xl)] ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Raster für Kacheln mit `--bento-gap` (Desktop `--bento-gap-wide`). Handy: eine Spalte, Hauptkachel zuerst. */
export function Bento({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-[var(--bento-gap)] md:gap-[var(--bento-gap-wide)] ${className}`}
    >
      {children}
    </div>
  );
}
