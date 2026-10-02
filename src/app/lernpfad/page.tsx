"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import {
  PLAYABLE_TODAY,
  PLAYABLE_UNITS,
  type PathUnitStatus,
} from "@/lib/learner/playable-path";
import { loadSession, type LearnerSession } from "@/lib/learner/session";

const statusTone: Record<PathUnitStatus, string> = {
  done: "bg-[var(--color-feedback-success)] text-white",
  today: "bg-[var(--color-brand-primary)] text-white",
  open: "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]",
};

export default function LernpfadPage() {
  const [session, setSession] = useState<LearnerSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  const subtitle = session
    ? `${session.keyword} · ${
        session.variant === "pruefung"
          ? "Prüfungsvorbereitung"
          : "Weiterbildung"
      }`
    : PLAYABLE_TODAY.occupation;

  return (
    <MobileShell>
      <header className="px-6 pb-4 pt-12">
        <h1
          className="text-[28px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lernpfad
        </h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
          {subtitle}
        </p>
      </header>

      <section className="px-6">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Heutiges Ziel
          </p>
          <p
            className="mt-1 text-base font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLAYABLE_TODAY.goal}
          </p>
        </div>
      </section>

      <ul className="flex flex-col gap-3 px-6 py-4">
        {PLAYABLE_UNITS.map((unit) => {
          const interactive = unit.status === "today" || unit.status === "open";
          const content = (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium ${statusTone[unit.status]}`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {unit.indexLabel}
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  className="truncate text-[15px] font-medium text-[var(--color-text-primary)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {unit.title}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {unit.statusLabel}
                </span>
              </span>
            </>
          );

          return (
            <li key={unit.id}>
              {interactive ? (
                <Link
                  href={`/einheit/${unit.id}`}
                  className="flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3.5 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3.5">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <BottomNav />
    </MobileShell>
  );
}
