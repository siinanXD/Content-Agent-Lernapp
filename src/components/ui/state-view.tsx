"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  heading = false,
}: {
  kind: Kind;
  title?: string;
  text?: string;
  /** Aktion, z. B. „Erneut versuchen“ */
  children?: ReactNode;
  /** Titel als Überschrift (h1) darstellen und beim Einblenden fokussieren (Fehler-, Leer-Seiten). */
  heading?: boolean;
}) {
  const c = copy[kind];
  const Icon = kind === "fehler" ? AlertIcon : kind === "offline" ? OfflineIcon : InboxIcon;
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (heading) titleRef.current?.focus();
  }, [heading]);
  const titleClass = "text-lg font-medium text-[var(--color-text-primary)]";
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
      {heading ? (
        <h1
          ref={titleRef}
          tabIndex={-1}
          className={`${titleClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title ?? c.title}
        </h1>
      ) : (
        <p className={titleClass} style={{ fontFamily: "var(--font-display)" }}>
          {title ?? c.title}
        </p>
      )}
      <p className="text-[15px] text-[var(--color-text-secondary)]">
        {text ?? c.text}
      </p>
      {children ? <div className="mt-2 w-full">{children}</div> : null}
    </div>
  );
}
