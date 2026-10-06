import type { ReactNode } from "react";

type Kind = "laden" | "leer" | "fehler" | "offline";

const copy: Record<Kind, { label: string; title: string; text: string }> = {
  laden: { label: "Laden", title: "Wird geladen", text: "Einen Moment bitte." },
  leer: { label: "Leer", title: "Noch nichts da", text: "Hier erscheinen bald Inhalte." },
  fehler: {
    label: "Fehler",
    title: "Das hat nicht geklappt",
    text: "Bitte versuche es noch einmal.",
  },
  offline: {
    label: "Offline",
    title: "Du bist offline",
    text: "Geladene Einheiten kannst du weiter lernen. Ergebnisse werden später übertragen.",
  },
};

/**
 * Zustände als Bento-Kachel (Figma W10 58:456 „Zustände · Offline und Fehler“, Screen 17):
 * Mono-Label in Großbuchstaben, darunter ein kurzer Satz. Laden, Leer, Fehler, Offline.
 */
export function StateView({
  kind,
  title,
  text,
  children,
}: {
  kind: Kind;
  title?: string;
  text?: string;
  /** Aktion, z. B. „Erneut versuchen“ */
  children?: ReactNode;
}) {
  const c = copy[kind];
  return (
    <div
      role={kind === "fehler" ? "alert" : "status"}
      data-state-kind={kind}
      className="flex flex-col gap-2 rounded-[20px] bg-[var(--color-bg-surface)] p-4 text-left"
    >
      <p className="mono-label flex items-center gap-2 uppercase text-[var(--color-text-secondary)]">
        {kind === "laden" ? (
          <span
            aria-hidden="true"
            className="block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-border-subtle)] border-t-[var(--color-brand-primary)] motion-reduce:animate-none"
          />
        ) : null}
        {c.label}
      </p>
      <p
        className="text-[15px] font-medium leading-[1.3] text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title ?? c.title}
      </p>
      <p className="text-sm leading-[1.3] text-[var(--color-text-secondary)]">
        {text ?? c.text}
      </p>
      {children ? <div className="mt-2 w-full">{children}</div> : null}
    </div>
  );
}
