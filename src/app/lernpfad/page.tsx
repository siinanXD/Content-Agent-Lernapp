"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import {
  groupUnitsByModule,
  PLAYABLE_TODAY,
  PLAYABLE_UNITS,
  type PathUnitStatus,
} from "@/lib/learner/playable-path";
import { loadSession, type LearnerSession } from "@/lib/learner/session";
import { dueItems, loadStack, stackSize } from "@/lib/learner/leitner";
import { listExamParts } from "@/lib/learner/exam";

const statusTone: Record<PathUnitStatus, string> = {
  done: "bg-[var(--color-feedback-success)] text-white",
  today: "bg-[var(--color-brand-primary)] text-white",
  open: "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]",
};

export default function LernpfadPage() {
  const [session, setSession] = useState<LearnerSession | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [stackCount, setStackCount] = useState(0);
  const groups = groupUnitsByModule(PLAYABLE_UNITS);
  const examParts = listExamParts().filter((p) => p.simulated);

  useEffect(() => {
    setSession(loadSession());
    const stack = loadStack();
    setDueCount(dueItems(stack).length);
    setStackCount(stackSize(stack));
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

      <section className="flex flex-col gap-3 px-6">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Heutiges Ziel
          </p>
          <p
            className="mt-1 text-base font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {dueCount > 0
              ? `${dueCount} fällige Wiederholungen, dann neue Einheiten`
              : PLAYABLE_TODAY.goal}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Wiederholungsstapel: {stackCount} Fragen
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/wiederholung"
            className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-4 text-sm font-medium text-[var(--color-text-on-brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Wiederholung
          </Link>
          <Link
            href="/pruefung"
            className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-sm font-medium text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Prüfungsmodus
          </Link>
        </div>
      </section>

      {groups.map((mod) => {
        const done = mod.blocks
          .flatMap((b) => b.units)
          .filter((u) => u.status === "done").length;
        const total = mod.blocks.flatMap((b) => b.units).length;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        return (
          <section key={mod.moduleId} className="px-6 pt-5">
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <h2
                  className="text-lg font-medium text-[var(--color-text-primary)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {mod.moduleId}: {mod.moduleTitle}
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Fortschritt {done}/{total}
                </p>
              </div>
              <p className="text-sm font-medium text-[var(--color-brand-primary)]">
                {pct}%
              </p>
            </div>
            <div
              className="mb-3 h-2 overflow-hidden rounded-full bg-[var(--color-border-subtle)]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Modul ${mod.moduleId} Fortschritt`}
            >
              <div
                className="h-full bg-[var(--color-brand-primary)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            {mod.blocks.map((block) => (
              <div key={block.blockId} className="mb-3">
                <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
                  {block.blockTitle}
                  {block.units[0]?.examAreas?.length ? (
                    <span className="ml-2 text-[var(--color-brand-primary)]">
                      · {block.units[0].examAreas.join(", ")}
                    </span>
                  ) : null}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {block.units.map((unit) => {
                    const interactive =
                      unit.status === "today" || unit.status === "open";
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
              </div>
            ))}
          </section>
        );
      })}

      <section className="px-6 py-5">
        <h2
          className="text-lg font-medium text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Prüfungsgebiete
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {examParts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pruefung?part=${p.id}`}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <span className="text-sm text-[var(--color-text-primary)]">
                  {p.bereich}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {p.durationMinutes} Min
                  {p.weightPercent != null ? ` · ${p.weightPercent}%` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <BottomNav />
    </MobileShell>
  );
}
