"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/learner/bottom-nav";
import { NextUpCard } from "@/components/ui/next-up-card";
import { PathNode, type PathNodeState } from "@/components/ui/path-node";
import { ConsentBanner } from "@/components/learner/consent-banner";
import { DailyGoal } from "@/components/ui/daily-goal";
import { StatChip } from "@/components/ui/stat-chip";
import { StateView } from "@/components/ui/state-view";
import { MobileShell } from "@/components/learner/mobile-shell";
import {
  activePathUnits,
  groupUnitsByModule,
  PLAYABLE_TODAY,
  type PathUnit,
  type PathUnitStatus,
} from "@/lib/learner/playable-path";
import {
  fetchPhaseAPathUnits,
  usingPhaseASnapshot,
} from "@/lib/learner/phase-a-path";
import { loadSession } from "@/lib/learner/session";
import {
  dueItems,
  loadStack,
  stackSize,
  type LeitnerStack,
} from "@/lib/learner/leitner";
import { listExamParts } from "@/lib/learner/exam";
import {
  formatDays,
  loadLearningSummary,
  type LearningSummary,
} from "@/lib/learner/streak";
import { useAfterMount } from "@/lib/use-after-mount";
import { useOnline } from "@/lib/use-online";

const NODE_STATE: Record<PathUnitStatus, PathNodeState> = {
  done: "erledigt",
  today: "heute",
  open: "offen",
};

/** Seitlicher Versatz der Knoten (px) für den Zickzack. */
const ZIGZAG = [0, 64, 128, 64];

export default function LernpfadPage() {
  const session = useAfterMount(loadSession, null);
  const summary = useAfterMount<LearningSummary | "laden" | "fehler">(
    loadLearningSummary,
    "laden",
  );
  const stack = useAfterMount<LeitnerStack | null>(loadStack, null);
  const dueCount = useMemo(() => (stack ? dueItems(stack).length : 0), [stack]);
  const stackCount = stack ? stackSize(stack) : 0;
  const [pathUnits, setPathUnits] = useState<PathUnit[]>(() => activePathUnits());
  const groups = groupUnitsByModule(pathUnits);
  const examParts = listExamParts().filter((p) => p.simulated);
  const online = useOnline();
  const phaseA = usingPhaseASnapshot() && pathUnits.length > 6;

  useEffect(() => {
    let cancelled = false;
    fetchPhaseAPathUnits().then((units) => {
      if (!cancelled && units.length) setPathUnits(units);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // „Als Nächstes“: heutige Einheit, sonst die erste offene.
  const nextUnit =
    pathUnits.find((u) => u.status === "today") ??
    pathUnits.find((u) => u.status === "open");

  const subtitle = session
    ? `${session.keyword} · ${
        session.variant === "pruefung"
          ? "Prüfungsvorbereitung"
          : "Weiterbildung"
      }`
    : PLAYABLE_TODAY.occupation;

  return (
    <MobileShell>
      <ConsentBanner />
      <header className="px-6 pb-2 pt-12">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1
              className="text-[28px] font-bold leading-9 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Lernpfad
            </h1>
            <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {phaseA
                ? `Phase A · ${pathUnits.length} Einheiten (M0, LF1, LF2, PA)`
                : "Demo-Seed Sicherheit — Phase A noch nicht veröffentlicht"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <StatChip
            kind="serie"
            value={formatDays(summary === "laden" || summary === "fehler" ? 0 : summary.streak.days)}
            label="Serie"
          />
          <StatChip
            kind="punkte"
            value={(session?.totalPoints ?? 0).toLocaleString("de-DE")}
            label="Punkte"
          />
          <StatChip
            kind="wiederholung"
            value={`${dueCount} fällig`}
            label={`Wiederholungen, Stapel mit ${stackCount} Fragen`}
          />
        </div>
      </header>

      <section className="flex flex-col gap-3 px-6 pt-2">
        {online ? null : <StateView kind="offline" />}
        {summary === "laden" ? (
          <StateView kind="laden" title="Tagesziel wird geladen" text="Einen Moment bitte." />
        ) : summary === "fehler" ? (
          <StateView
            kind="fehler"
            title="Serie konnte nicht geladen werden"
            text="Dein Fortschritt ist gespeichert. Wir versuchen es gleich noch einmal."
          />
        ) : (
          <DailyGoal summary={summary} dueCount={dueCount} />
        )}
        {dueCount > 0 ? (
          <Link
            href="/wiederholung"
            className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {dueCount} {dueCount === 1 ? "Wiederholung" : "Wiederholungen"} fällig
            </span>
            <span className="text-sm font-semibold text-[var(--color-brand-primary)]">
              Starten
            </span>
          </Link>
        ) : null}
        {nextUnit ? (
          <NextUpCard
            indexLabel={nextUnit.indexLabel}
            title={nextUnit.title}
            minutes={nextUnit.minutes}
            preview={nextUnit.questions[0]?.prompt}
            href={`/einheit/${nextUnit.id}`}
          />
        ) : null}
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

      {groups.length === 0 ? (
        <StateView
          kind="leer"
          title="Noch keine Einheiten"
          text="Sobald Einheiten veröffentlicht sind, erscheint hier dein Pfad."
        />
      ) : null}

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
                  {mod.moduleId} · {mod.moduleTitle}
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
                {/* 02b Karte: Zickzack-Pfad je Modul */}
                <ol className="flex flex-col gap-5 py-2">
                  {block.units.map((unit, i) => (
                    <li
                      key={unit.id}
                      style={{ paddingLeft: ZIGZAG[i % ZIGZAG.length] }}
                    >
                      <PathNode
                        state={NODE_STATE[unit.status]}
                        indexLabel={unit.indexLabel}
                        title={unit.title}
                        href={
                          unit.status === "done"
                            ? undefined
                            : `/einheit/${unit.id}`
                        }
                      />
                    </li>
                  ))}
                </ol>
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
