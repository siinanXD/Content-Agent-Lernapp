import { FlameIcon, RepeatIcon, StarIcon } from "@/components/ui/icons";

type Kind = "serie" | "punkte" | "wiederholung";

const icons = { serie: FlameIcon, punkte: StarIcon, wiederholung: RepeatIcon };

/** StatChip (Figma 19:279): Varianten Serie / Punkte / Wiederholung. */
export function StatChip({
  kind,
  value,
  label,
}: {
  kind: Kind;
  value: string;
  label: string;
}) {
  const Icon = icons[kind];
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-[var(--color-brand-primary)]"
      data-kind={kind}
    >
      <Icon />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className="text-base font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      </span>
    </div>
  );
}
