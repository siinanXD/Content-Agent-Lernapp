import { FlameIcon, RepeatIcon, StarIcon } from "@/components/ui/icons";

type Kind = "serie" | "punkte" | "wiederholung";

const icons = { serie: FlameIcon, punkte: StarIcon, wiederholung: RepeatIcon };

/** Icon-Farbe je Variante (Figma 19:279). Der Wert selbst bleibt AA-tauglich (≥ 4,5:1). */
const iconTone: Record<Kind, string> = {
  serie: "text-[var(--color-brand-accent)]",
  punkte: "text-[var(--color-brand-primary)]",
  wiederholung: "text-[var(--color-feedback-success)]",
};

const valueTone: Record<Kind, string> = {
  serie: "text-[var(--color-brand-primary)]",
  punkte: "text-[var(--color-brand-primary)]",
  wiederholung: "text-[var(--color-feedback-success)]",
};

/**
 * StatChip (Figma 19:279, Stil E): Pille mit Icon und Wert.
 * Varianten Serie / Punkte / Wiederholung. Das Label bleibt für Screenreader
 * erhalten und ist mit `showLabel` auch sichtbar.
 */
export function StatChip({
  kind,
  value,
  label,
  showLabel = false,
}: {
  kind: Kind;
  value: string;
  label: string;
  showLabel?: boolean;
}) {
  const Icon = icons[kind];
  return (
    <div
      className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2"
      data-kind={kind}
    >
      <span className={iconTone[kind]}>
        <Icon />
      </span>
      <span
        className={`text-[15px] font-bold leading-5 ${valueTone[kind]}`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
      <span
        className={
          showLabel
            ? "text-xs text-[var(--color-text-secondary)]"
            : "sr-only"
        }
      >
        {label}
      </span>
    </div>
  );
}
