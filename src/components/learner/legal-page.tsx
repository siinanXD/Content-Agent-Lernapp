import Link from "next/link";
import type { ReactNode } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";

/** Seitengerüst für Rechtliches. Keine erfundenen Rechtstexte: Platzhalter „Text folgt“. */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-4 px-6 pb-8 pt-12">
        <Link
          href="/einstellungen"
          className="inline-flex min-h-11 items-center self-start text-sm text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          Zurück zu den Einstellungen
        </Link>
        <h1
          className="text-[28px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {children}
        <p className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5 text-[15px] text-[var(--color-text-primary)]">
          Text folgt.
        </p>
      </main>
    </MobileShell>
  );
}
