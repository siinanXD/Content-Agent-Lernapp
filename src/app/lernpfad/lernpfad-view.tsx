"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/learner/bottom-nav";
import { NextUpCard } from "@/components/ui/next-up-card";
import { PathNode, type PathNodeState } from "@/components/ui/path-node";
import { ConsentBanner } from "@/components/learner/consent-banner";
import {
  GoalTile,
  ReadinessTile,
  ReviewTile,
  StreakTile,
} from "@/components/learner/today-tiles";
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
} from "@/lib/learner/phase-a-path";
import { loadSession } from "@/lib/learner/session";
import { dueItems, loadStack, type LeitnerStack } from "@/lib/learner/leitner";
import {
  EMPTY_LEARNING_SUMMARY,
  EMPTY_WEEK,
  loadLearningSummary,
  loadWeek,
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

/** Ein ruhiger Satz unter dem Titel der Hauptkachel, aus dem echten Stand des Tagesziels. */
function nextNote(summary: LearningSummary): string {
  const { goal } = summary;
  if (goal.reached) return "Dein Tagesziel ist schon geschafft. Mehr ist freiwillig.";
  if (goal.remaining === 1) return "Danach ist dein Tagesziel erreicht.";
  return `Noch ${goal.remaining} Einheiten bis zum Tagesziel.`;
}

/**
 * Heute / Lernpfad (Figma A1 52:377, Variante 2026): Bento mit Hauptkachel „Als Nächstes“,
 * Tagesziel, Serie, Wiederholung und Prüfungsreife; darunter die Lernpfad-Karte (02b).
 * Die Einheiten kommen fertig vom Server (SIN-311), damit der erste Bildaufbau nicht auf einen Abruf wartet.
 */
export function LernpfadView({ initialUnits }: { initialUnits: PathUnit[] }) {
  const session = useAfterMount(loadSession, null);
  // Server-HTML zeigt den Stand ohne Ereignisse statt eines Lade-Zustands: kein Austausch, kein Sprung.
  const summary = useAfterMount<LearningSummary | "fehler">(
    loadLearningSummary,
    EMPTY_LEARNING_SUMMARY,
  );
  const week = useAfterMount(loadWeek, EMPTY_WEEK);
  const stack = useAfterMount<LeitnerStack | null>(loadStack, null);
  const dueCount = useMemo(() => (stack ? dueItems(stack).length : 0), [stack]);
  const [pathUnits, setPathUnits] = useState(initialUnits);
  const groups = groupUnitsByModule(pathUnits);
  const online = useOnline();

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
        session.variant === "pruefung" ? "Prüfungsvorbereitung" : "Weiterbildung"
      }`
    : PLAYABLE_TODAY.occupation;

  const readiness = groups.map((mod) => {
    const units = mod.blocks.flatMap((b) => b.units);
    const done = units.filter((u) => u.status === "done").length;
    return { id: mod.moduleId, pct: units.length === 0 ? 0 : Math.round((done / units.length) * 100) };
  });

  const goalSummary = summary === "fehler" ? EMPTY_LEARNING_SUMMARY : summary;

  return (
    <MobileShell>
      <ConsentBanner />
      <header className="flex flex-col gap-0.5 px-4 pb-3.5 pt-11">
        <p className="mono-label text-[var(--color-text-secondary)]">{subtitle}</p>
        <h1
          className="text-2xl font-bold leading-[1.3] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Heute
        </h1>
      </header>

      <div className="flex flex-col gap-[var(--bento-gap)] px-4 pb-6 lg:gap-[var(--bento-gap-wide)]">
        {online ? null : <StateView kind="offline" />}
        {summary === "fehler" ? (
          <StateView
            kind="fehler"
            title="Serie konnte nicht geladen werden"
            text="Dein Fortschritt ist gespeichert. Wir versuchen es gleich noch einmal."
          />
        ) : null}

        {nextUnit ? (
          <NextUpCard
            indexLabel={nextUnit.indexLabel}
            title={nextUnit.title}
            minutes={nextUnit.minutes}
            note={summary === "fehler" ? undefined : nextNote(goalSummary)}
            href={`/einheit/${nextUnit.id}`}
          />
        ) : groups.length === 0 ? (
          <StateView
            kind="leer"
            title="Noch keine Einheiten"
            text="Sobald Einheiten veröffentlicht sind, erscheint hier dein Pfad."
          />
        ) : (
          <StateView
            kind="leer"
            title="Alles geschafft"
            text="Heute schon alles geschafft. Morgen geht’s weiter."
          />
        )}

        <div className="grid grid-cols-2 gap-[var(--bento-gap)] lg:gap-[var(--bento-gap-wide)]">
          <GoalTile summary={goalSummary} dueCount={dueCount} />
          <StreakTile summary={goalSummary} week={week} />
        </div>

        <ReviewTile dueCount={dueCount} />

        {readiness.length > 0 ? <ReadinessTile rows={readiness} /> : null}
      </div>

      {groups.length > 0 ? (
        <section id="pfad" aria-labelledby="pfad-title" className="flex flex-col gap-[var(--bento-gap)] px-4 pb-6">
          <h2
            id="pfad-title"
            className="mono-label uppercase text-[var(--color-text-secondary)]"
          >
            Lernpfad
          </h2>
          {groups.map((mod) => {
            const units = mod.blocks.flatMap((b) => b.units);
            const done = units.filter((u) => u.status === "done").length;
            return (
              <section
                key={mod.moduleId}
                aria-labelledby={`modul-${mod.moduleId}`}
                className="rounded-[20px] bg-[var(--color-bg-surface)] p-4"
              >
                <p className="mono-label text-[var(--color-text-secondary)]">
                  {mod.moduleId} · {done}/{units.length}
                </p>
                <h3
                  id={`modul-${mod.moduleId}`}
                  className="text-[17px] font-semibold leading-[1.3] text-[var(--color-text-primary)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {mod.moduleTitle}
                </h3>
                {mod.blocks.map((block) => (
                  <div key={block.blockId} className="mt-3">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {block.blockTitle}
                      {block.units[0]?.examAreas?.length ? (
                        <span className="mono-label ml-2 text-[var(--color-brand-primary)]">
                          {block.units[0].examAreas.join(", ")}
                        </span>
                      ) : null}
                    </p>
                    {/* 02b Karte: Zickzack-Pfad je Modul */}
                    <ol className="flex flex-col gap-5 py-3">
                      {block.units.map((unit, i) => (
                        <li key={unit.id} style={{ paddingLeft: ZIGZAG[i % ZIGZAG.length] }}>
                          <PathNode
                            state={NODE_STATE[unit.status]}
                            indexLabel={unit.indexLabel}
                            title={unit.title}
                            href={unit.status === "done" ? undefined : `/einheit/${unit.id}`}
                          />
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </section>
            );
          })}
        </section>
      ) : null}

      <BottomNav />
    </MobileShell>
  );
}
