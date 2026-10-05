import Link from "next/link";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

export type PathNodeState = "erledigt" | "heute" | "offen" | "gesperrt";

/** Figma 19:265 (Stil E): Erledigt grün, Heute schwarz mit orangem Ring, Offen/Gesperrt weiß. */
const tone: Record<PathNodeState, string> = {
  erledigt: "bg-[var(--color-feedback-success)] text-white border-transparent",
  heute:
    "bg-[var(--color-bg-hero)] text-[var(--color-text-on-brand)] border-transparent",
  offen:
    "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)]",
  gesperrt:
    "bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]",
};

const stateLabel: Record<PathNodeState, string> = {
  erledigt: "erledigt",
  heute: "heute dran",
  offen: "offen",
  gesperrt: "gesperrt",
};

/**
 * PathNode (Figma 19:265): Knoten der Lernpfad-Karte.
 * Varianten Erledigt / Heute / Offen / Gesperrt; Gesperrt ist kein Link.
 */
export function PathNode({
  state,
  indexLabel,
  title,
  href,
}: {
  state: PathNodeState;
  indexLabel: string;
  title: string;
  href?: string;
}) {
  const circle = (
    <span
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold ${tone[state]} ${
        state === "heute"
          ? "ring-4 ring-[var(--color-brand-accent)] ring-offset-2 ring-offset-[var(--color-bg-canvas)]"
          : ""
      }`}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {state === "erledigt" ? (
        <CheckIcon />
      ) : state === "gesperrt" ? (
        <LockIcon />
      ) : (
        indexLabel
      )}
    </span>
  );
  const text = (
    <span className="flex min-w-0 max-w-[150px] flex-col">
      <span
        className={`text-[13px] leading-snug text-[var(--color-text-primary)] ${
          state === "heute" ? "font-medium" : ""
        }`}
      >
        {title}
      </span>
      <span className="text-xs text-[var(--color-text-secondary)]">
        {stateLabel[state]}
      </span>
    </span>
  );
  const cls =
    "flex items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]";
  return href && state !== "gesperrt" ? (
    <Link href={href} className={cls} data-state={state}>
      {circle}
      {text}
    </Link>
  ) : (
    <div className={cls} data-state={state} aria-disabled={state === "gesperrt"}>
      {circle}
      {text}
    </div>
  );
}
