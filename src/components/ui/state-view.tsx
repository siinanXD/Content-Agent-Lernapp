import type { ReactNode } from "react";
import { AlertIcon, InboxIcon, OfflineIcon } from "@/components/ui/icons";

type Kind = "laden" | "leer" | "fehler" | "offline";

const copy: Record<Kind, { title: string; text: string }> = {
  laden: { title: "Wird geladen", text: "Einen Moment bitte." },
  leer: { title: "Noch nichts da", text: "Hier erscheinen bald Inhalte." },
  fehler: {
    title: "Das hat nicht geklappt",
    text: "Bitte versuche es noch einmal.",
  },
  offline: {
    title: "Du bist offline",
    text: "Geladene Einheiten kannst du weiter lernen. Ergebnisse werden später übertragen.",
  },
};

/** Zustände (Figma Screen 17): Laden, Leer, Fehler, Offline. */
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
  const Icon = kind === "fehler" ? AlertIcon : kind === "offline" ? OfflineIcon : InboxIcon;
  return (
    <div
      role={kind === "fehler" ? "alert" : "status"}
      data-state-kind={kind}
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <span className="text-[var(--color-brand-primary)]">
        {kind === "laden" ? (
          <span
            aria-hidden="true"
            className="block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border-subtle)] border-t-[var(--color-brand-primary)] motion-reduce:animate-none"
          />
        ) : (
          <Icon />
        )}
      </span>
      <p
        className="text-lg font-medium text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title ?? c.title}
      </p>
      <p className="text-[15px] text-[var(--color-text-secondary)]">
        {text ?? c.text}
      </p>
      {children ? <div className="mt-2 w-full">{children}</div> : null}
    </div>
  );
}
