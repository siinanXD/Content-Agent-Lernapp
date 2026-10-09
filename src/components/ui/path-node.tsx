import Link from "next/link";

export type PathNodeState = "erledigt" | "heute" | "offen" | "gesperrt";

const stateLabel: Record<PathNodeState, string> = {
  erledigt: "Fertig",
  heute: "Jetzt",
  offen: "Offen",
  gesperrt: "Gesperrt",
};

/** Punkt der Achse (Figma N5, 81:456): fertig schwarz, jetzt orange und größer, offen weiß mit Rand. */
const dot: Record<PathNodeState, string> = {
  erledigt: "h-5 w-5 border-[var(--color-bg-hero)] bg-[var(--color-bg-hero)]",
  heute: "h-7 w-7 border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]",
  offen: "h-5 w-5 border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]",
  gesperrt: "h-5 w-5 border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]",
};

/**
 * PathNode (Figma N5, Knoten der Lernpfad-Karte): Punkt auf einer senkrechten Achse mit
 * Kennung (Geist Mono) und Titel. Zustände Fertig / Jetzt / Offen; „Gesperrt“ ist kein Link.
 * `last` lässt die Linie nach dem letzten Knoten weg.
 */
export function PathNode({
  state,
  indexLabel,
  title,
  href,
  last = false,
}: {
  state: PathNodeState;
  indexLabel: string;
  title: string;
  href?: string;
  last?: boolean;
}) {
  const axis = (
    <span aria-hidden="true" className="flex w-7 shrink-0 flex-col items-center">
      <span className={`shrink-0 rounded-full border-2 ${dot[state]}`} />
      {last ? null : (
        <span
          className={`min-h-[18px] w-0.5 flex-1 ${
            state === "erledigt" ? "bg-[var(--color-bg-hero)]" : "bg-[var(--color-border-subtle)]"
          }`}
        />
      )}
    </span>
  );
  const text = (
    <span className="flex min-w-0 flex-col gap-0.5 pb-2">
      <span
        className={`mono-label ${
          state === "heute" ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-secondary)]"
        }`}
      >
        {indexLabel} · {stateLabel[state]}
      </span>
      <span
        className={
          state === "heute"
            ? "text-[17px] font-bold leading-[22px] text-[var(--color-text-primary)]"
            : `text-[15px] font-medium leading-5 ${
                state === "erledigt" ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
              }`
        }
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </span>
    </span>
  );
  const cls =
    "flex min-h-11 items-stretch gap-3.5 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";
  return href && state !== "gesperrt" ? (
    <Link href={href} className={cls} data-state={state}>
      {axis}
      {text}
    </Link>
  ) : (
    <div className={cls} data-state={state} aria-disabled={state === "gesperrt"}>
      {axis}
      {text}
    </div>
  );
}
