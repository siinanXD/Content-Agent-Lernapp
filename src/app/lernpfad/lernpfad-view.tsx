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
import { nextDueAt, reviewTileCopy } from "@/lib/learner/review-overview";
import { listExamParts } from "@/lib/learner/exam";
import {
  EMPTY_LEARNING_SUMMARY,
  formatDays,
  loadLearningEvents,
  loadLearningSummary,
  weekActivity,
  type LearningSummary,
  type WeekDay,
} from "@/lib/learner/streak";
import { useAfterMount } from "@/lib/use-after-mount";
import { useOnline } from "@/lib/use-online";

const NODE_STATE: Record<PathUnitStatus, PathNodeState> = {
  done: "erledigt",
  today: "heute",
  open: "offen",
};

const EMPTY_WEEK: Array<WeekDay | null> = Array.from({ length: 7 }, () => null);

/** Letzte 7 Tage aus dem lokalen Speicher; stabile Referenz für `useAfterMount`. */
const loadWeek = (): WeekDay[] => weekActivity(loadLearningEvents());

const weekdayShort = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");

/** Seitlicher Versatz der Knoten (px) für den Zickzack. */
const ZIGZAG = [0, 64, 128, 64];

/**
 * Lernpfad. Die Einheiten kommen fertig vom Server (SIN-311), damit der erste Bildaufbau
 * nicht auf einen Abruf wartet und im Regelfall nach dem Laden nichts mehr ausgetauscht wird.
 */
export function LernpfadView({ initialUnits }: { initialUnits: PathUnit[] }) {
  const session = useAfterMount(loadSession, null);
  // Server-HTML zeigt den Stand ohne Ereignisse statt eines Lade-Zustands: kein Austausch, kein Sprung.
  const summary = useAfterMount<LearningSummary | "fehler">(
    loadLearningSummary,
    EMPTY_LEARNING_SUMMARY,
  );
  const week = useAfterMount<WeekDay[] | null>(loadWeek, null);
  const stack = useAfterMount<LeitnerStack | null>(loadStack, null);
  const dueCount = useMemo(() => (stack ? dueItems(stack).length : 0), [stack]);
  const stackCount = stack ? stackSize(stack) : 0;
  const reviewCopy = reviewTileCopy(dueCount, stackCount, stack ? nextDueAt(stack) : null);
  const [pathUnits, setPathUnits] = useState(initialUnits);
  const groups = groupUnitsByModule(pathUnits);
  const examParts = listExamParts().filter((p) => p.simulated);
  const online = useOnline();
  const phaseA = usingPhaseASnapshot() && pathUnits.length > 6;

  // Wärmt den Zwischenspeicher für Einheit, Wiederholung und Prüfung. Die Anzeige wechselt nur, wenn
  // die Einheiten von denen des Servers abweichen (z. B. frisch veröffentlicht); sonst bleibt sie stehen.
  useEffect(() => {
    let cancelled = false;
    fetchPhaseAPathUnits().then((units) => {
      const same =
        units.length === initialUnits.length && units.every((u, i) => u.id === initialUnits[i].id);
      if (!cancelled && units.length && !same) setPathUnits(units);
    });
    return () => {
      cancelled = true;
    };
  }, [initialUnits]);

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

  const readiness = groups.map((mod) => {
    const all = mod.blocks.flatMap((b) => b.units);
    const done = all.filter((u) => u.status === "done").length;
    return {
      moduleId: mod.moduleId,
      moduleTitle: mod.moduleTitle,
      done,
      total: all.length,
      pct: all.length === 0 ? 0 : Math.round((done / all.length) * 100),
    };
  });

  return (
    <MobileShell wide>
      <ConsentBanner />
      <header className="px-6 pb-4 pt-12 md:px-12">
        <p className="bento-label">Heute</p>
        <h1
          className="mt-1 text-[40px] font-bold leading-[44px] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lernpfad
        </h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">{subtitle}</p>
        <p className="bento-label mt-1">
          {phaseA
            ? `Phase A · ${pathUnits.length} Einheiten (M0, LF1, LF2, PA)`
            : "Demo-Seed Sicherheit — Phase A noch nicht veröffentlicht"}
        </p>
      </header>

      <div className="bento px-6 md:px-12">
        {online ? null : (
          <div className="bento-tile bento-span-6">
            <StateView kind="offline" />
          </div>
        )}
        {nextUnit ? (
          <NextUpCard
            className="bento-span-4"
            indexLabel={nextUnit.indexLabel}
            title={nextUnit.title}
            minutes={nextUnit.minutes}
            preview={nextUnit.questions[0]?.prompt}
            href={`/einheit/${nextUnit.id}`}
          />
        ) : null}
        {summary === "fehler" ? (
          <div className="bento-tile bento-span-2">
            <StateView
              kind="fehler"
              title="Serie konnte nicht geladen werden"
              text="Dein Fortschritt ist gespeichert. Wir versuchen es gleich noch einmal."
            />
          </div>
        ) : (
          <DailyGoal className="bento-span-2" summary={summary} dueCount={dueCount} />
        )}

        <section aria-label="Serie" className="bento-tile bento-span-3">
          <p className="bento-label">Serie</p>
          <StatChip
            kind="serie"
            value={formatDays(summary === "fehler" ? 0 : summary.streak.days)}
            label="Serie"
          />
          <ol aria-label="Letzte 7 Tage" className="mt-1 flex justify-between gap-1">
            {(week ?? EMPTY_WEEK).map((d, i) => (
              <li key={d?.day ?? i} className="flex flex-col items-center gap-1">
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 rounded-full border-2 ${
                    d && d.count > 0
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]"
                      : "border-[var(--color-border-subtle)] bg-transparent"
                  } ${d?.today ? "outline outline-2 outline-offset-2 outline-[var(--color-bg-hero)]" : ""}`}
                />
                <span className="bento-label" aria-hidden="true">
                  {d ? weekdayShort(d.day) : "–"}
                </span>
                <span className="sr-only">
                  {d ? `${weekdayShort(d.day)}: ${d.count > 0 ? "gelernt" : "nicht gelernt"}${d.today ? " (heute)" : ""}` : "noch nicht geladen"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Wiederholung" className="bento-tile bento-span-3">
          <p className="bento-label">Wiederholung</p>
          <h2
            className="text-lg font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {reviewCopy.title}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">{reviewCopy.text}</p>
          <Link
            href="/wiederholung"
            className="mt-auto inline-flex min-h-11 items-center self-start text-sm font-semibold text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            {dueCount > 0 ? "Wiederholung starten" : "Zur Wiederholung"}
          </Link>
        </section>

        {readiness.length > 0 ? (
          <section aria-label="Prüfungsreife" className="bento-tile bento-span-6">
            <p className="bento-label">Prüfungsreife je Lernfeld</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Anteil der erledigten Einheiten. Ob du zur Prüfung zugelassen wirst, entscheidet ein Mensch.
            </p>
            <ul className="mt-2 flex flex-col gap-4">
              {readiness.map((r) => (
                <li key={r.moduleId}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {r.moduleId} · {r.moduleTitle}
                    </span>
                    <span className="bento-label">
                      {r.done}/{r.total}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-[var(--color-border-subtle)]"
                    role="progressbar"
                    aria-valuenow={r.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Modul ${r.moduleId} Fortschritt`}
                  >
                    <div
                      className="grow-bar h-full bg-[var(--color-brand-primary)]"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <StateView
          kind="leer"
          title="Noch keine Einheiten"
          text="Sobald Einheiten veröffentlicht sind, erscheint hier dein Pfad."
        />
      ) : null}

      {groups.map((mod) => {
        return (
          <section key={mod.moduleId} className="px-6 pt-8 md:px-12">
            <h2
              className="mb-2 text-lg font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {mod.moduleId} · {mod.moduleTitle}
            </h2>
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

      <section className="px-6 py-8 md:px-12">
        <p className="bento-label">Prüfung</p>
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
                className="flex min-h-11 items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
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
