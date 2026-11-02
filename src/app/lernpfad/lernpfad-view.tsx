"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/learner/bottom-nav";
import { NextUpCard } from "@/components/ui/next-up-card";
import { PathNode, type PathNodeState } from "@/components/ui/path-node";
import { ConsentBanner } from "@/components/learner/consent-banner";
import { DailyGoal } from "@/components/ui/daily-goal";
import { StateView } from "@/components/ui/state-view";
import { MobileShell } from "@/components/learner/mobile-shell";
import {
  groupUnitsByModule,
  withEmptyModules,
  type PathUnit,
  type PathUnitStatus,
} from "@/lib/learner/playable-path";
import { fetchPhaseAPathUnits, setActiveCourse } from "@/lib/learner/phase-a-path";
import { completedUnitIds, withProgress } from "@/lib/learner/path-progress";
import { demoDoneUnitIds, isDemoMode } from "@/lib/learner/demo-modus";
import { begruessung, type Begruessung } from "@/lib/learner/begruessung";
import {
  dueItems,
  loadStack,
  stackSize,
  type LeitnerStack,
} from "@/lib/learner/leitner";
import { nextDueAt, reviewTileCopy } from "@/lib/learner/review-overview";
import { sauberTitel } from "@/lib/learner/titel";
import {
  EMPTY_LEARNING_SUMMARY,
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

/** Erledigte Einheiten aus den lokalen Lernereignissen; im Beispielmodus erfundene (SIN-1446). */
type Progress = { demo: boolean; done: ReadonlySet<string> };
const NO_PROGRESS: Progress = { demo: false, done: new Set() };
const loadProgress = (): Progress => ({
  demo: isDemoMode(),
  done: completedUnitIds(loadLearningEvents()),
});

/** Wochentag und Begrüßung im Browser; stabile Referenz für `useAfterMount`. */
const loadGreeting = (): Begruessung => begruessung(new Date());

/** Erster Satz der Erklärung als Vorschau, ohne Adressen; die Fragen gehören nicht auf die Startkarte. */
const kurzSatz = (text: string): string | undefined => {
  const satz = sauberTitel(text).split(/(?<=[.!?])\s/)[0]?.trim();
  return satz && satz.length <= 160 ? satz : undefined;
};

const weekdayShort = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");

/** Kachel im Figma-Maß (16 px Innenabstand); `bento-tile` hat dagegen fest 24 px. */
const tile =
  "flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/**
 * Lernpfad (Figma 52:377, A1). Die Einheiten kommen fertig vom Server (SIN-311), damit der erste Bildaufbau
 * nicht auf einen Abruf wartet und im Regelfall nach dem Laden nichts mehr ausgetauscht wird.
 */
export function LernpfadView({
  initialUnits,
  modules = [],
  courseId = null,
  ansicht = "heute",
}: {
  /** „Heute“ (A1) oder „Pfad“ (N5, genau ein Modul) (SIN-1455). */
  ansicht?: "heute" | "pfad";
  initialUnits: PathUnit[];
  /** Kurs aus `/lernpfad/[kurs]`; ohne Angabe der Standardkurs (SIN-777). */
  courseId?: string | null;
  /** Alle Module des Kurses; solche ohne Einheiten zeigen den Leerzustand (SIN-452). */
  modules?: Array<{ id: string; title: string }>;
}) {
  const hello = useAfterMount<Begruessung | null>(loadGreeting, null);
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
  const [loadedUnits, setPathUnits] = useState(initialUnits);
  // Server-HTML und erster Bildaufbau zeigen den Stand ohne Ereignisse: nichts erledigt, die erste Einheit ist „Jetzt“.
  const progress = useAfterMount<Progress>(loadProgress, NO_PROGRESS);
  const pathUnits = useMemo(
    () =>
      withProgress(
        loadedUnits,
        progress.demo ? demoDoneUnitIds(loadedUnits.map((u) => u.id)) : progress.done,
      ),
    [loadedUnits, progress],
  );
  const groups = groupUnitsByModule(pathUnits);
  const pathModules = withEmptyModules(groups, modules);
  // Pfad zeigt ein Modul: gewähltes, sonst das mit der nächsten offenen Einheit, sonst das erste mit Einheiten.
  const [chosen, setChosen] = useState<string | null>(null);
  const current =
    pathModules.find((m) => m.moduleId === chosen) ??
    pathModules.find((m) => m.blocks.some((b) => b.units.some((u) => u.status !== "done"))) ??
    pathModules.find((m) => m.units > 0) ??
    pathModules[0];
  const online = useOnline();
  const days = summary === "fehler" ? 0 : summary.streak.days;

  // Wärmt den Zwischenspeicher für Einheit, Wiederholung und Prüfung. Die Anzeige wechselt nur, wenn
  // die Einheiten von denen des Servers abweichen (z. B. frisch veröffentlicht); sonst bleibt sie stehen.
  useEffect(() => {
    let cancelled = false;
    setActiveCourse(courseId);
    fetchPhaseAPathUnits(courseId).then((units) => {
      const same =
        units.length === initialUnits.length && units.every((u, i) => u.id === initialUnits[i].id);
      if (!cancelled && units.length && !same) setPathUnits(units);
    });
    return () => {
      cancelled = true;
    };
  }, [initialUnits, courseId]);

  // „Als Nächstes“: die erste Einheit, die nicht erledigt ist.
  const nextUnit = pathUnits.find((u) => u.status !== "done");

  // Nur Module mit Einheiten zählen (`groups` enthält keine leeren Module).
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
      <main className="flex flex-1 flex-col">
      <header className="px-6 pb-4 pt-11 md:px-12">
        <p className="bento-label uppercase">{ansicht === "heute" ? hello?.weekday : "Modul für Modul"}</p>
        <h1
          className="mt-0.5 text-[24px] font-bold leading-[31px] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {ansicht === "heute" ? (hello?.greeting ?? "Hallo") : "Dein Pfad"}
        </h1>
        <nav aria-label="Ansicht" className="mt-3 flex gap-2">
          {(
            [
              ["heute", "Heute", courseId ? `/lernpfad/${courseId}` : "/lernpfad"],
              ["pfad", "Pfad", courseId ? `/lernpfad/${courseId}/pfad` : "/lernpfad/pfad"],
            ] as const
          ).map(([id, label, href]) => (
            <Link
              key={id}
              href={href}
              aria-current={ansicht === id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-[var(--radius-md)] border px-4 text-sm font-semibold ${focus} ${
                ansicht === id
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)]"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {ansicht === "heute" ? (
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
            preview={kurzSatz(nextUnit.explanation)}
            href={`/einheit/${nextUnit.id}`}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-3 bento-span-6">
          {summary === "fehler" ? (
            <div className="bento-tile">
              <StateView
                kind="fehler"
                title="Serie konnte nicht geladen werden"
                text="Dein Fortschritt ist gespeichert. Wir versuchen es gleich noch einmal."
              />
            </div>
          ) : (
            <DailyGoal vertical summary={summary} dueCount={dueCount} />
          )}

          <section aria-label="Serie" className="flex flex-col gap-2 rounded-[var(--radius-xl)] bg-[var(--color-bg-hint)] p-4">
            <p className="mono-label text-[var(--color-text-hint)]">Serie</p>
            <p data-kind="serie" className="text-[var(--color-text-hint)]">
              <span
                className="block text-[44px] font-bold leading-[52px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {days}
              </span>{" "}
              <span className="block text-[13px] font-medium leading-[17px]">
                {days === 1 ? "Tag am Stück" : "Tage am Stück"}
              </span>
            </p>
            <ol aria-label="Letzte 7 Tage" className="mt-auto flex justify-between gap-1 pt-1">
              {(week ?? EMPTY_WEEK).map((d, i) => (
                <li key={d?.day ?? i} className="flex flex-col items-center gap-1">
                  <span
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 rounded-full border-2 ${
                      d && d.count > 0
                        ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]"
                        : "border-[var(--color-text-hint)] bg-transparent"
                    } ${d?.today ? "outline outline-2 outline-offset-2 outline-[var(--color-bg-hero)]" : ""}`}
                  />
                  <span className="mono-label text-[var(--color-text-hint)]" aria-hidden="true">
                    {d ? weekdayShort(d.day) : "–"}
                  </span>
                  <span className="sr-only">
                    {d ? `${weekdayShort(d.day)}: ${d.count > 0 ? "gelernt" : "nicht gelernt"}${d.today ? " (heute)" : ""}` : "noch nicht geladen"}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section aria-label="Wiederholung" className={`${tile} bento-span-3`}>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-hint)] text-xl font-bold leading-none text-[var(--color-brand-primary)]"
            >
              ↻
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2
                className="text-[15px] font-semibold leading-[19.5px] text-[var(--color-text-primary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {reviewCopy.title}
              </h2>
              <p className="text-xs leading-4 text-[var(--color-text-secondary)]">{reviewCopy.text}</p>
            </div>
          </div>
          <Link
            href="/wiederholung"
            className={`inline-flex min-h-11 items-center self-start text-sm font-semibold text-[var(--color-brand-primary)] underline underline-offset-4 ${focus}`}
          >
            {dueCount > 0 ? "Wiederholung starten" : "Zur Wiederholung"}
          </Link>
        </section>

        {readiness.length > 0 ? (
          <section aria-label="Prüfungsreife" className={`${tile} bento-span-6`}>
            <h2
              className="text-[15px] font-semibold leading-[19.5px] text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Prüfungsreife
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Anteil der erledigten Einheiten. Ob du zur Prüfung zugelassen wirst, entscheidet ein Mensch.
            </p>
            <ul className="mt-1 flex flex-col gap-2.5">
              {readiness.map((r) => (
                <li key={r.moduleId} className="flex items-center gap-2.5">
                  <span className="mono-label w-8 shrink-0 text-[var(--color-text-secondary)]">
                    {r.moduleId}
                  </span>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-border-subtle)]"
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
                  <span className="mono-label w-10 shrink-0 text-right text-[var(--color-text-primary)]">
                    {r.pct} %
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      ) : null}

      {ansicht === "pfad" && pathModules.length === 0 ? (
        <StateView
          kind="leer"
          title="Noch keine Einheiten"
          text="Sobald Einheiten veröffentlicht sind, erscheint hier dein Pfad."
        />
      ) : null}

      {ansicht === "pfad" && pathModules.length > 1 ? (
        <nav aria-label="Modul wählen" className="px-6 pt-2 md:px-12">
          <ul className="flex flex-wrap gap-2">
            {pathModules.map((m) => (
              <li key={m.moduleId}>
                <button
                  type="button"
                  aria-pressed={m.moduleId === current?.moduleId}
                  onClick={() => setChosen(m.moduleId)}
                  className={`mono-label min-h-11 rounded-[var(--radius-md)] border px-3.5 ${focus} ${
                    m.moduleId === current?.moduleId
                      ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)]"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                  }`}
                >
                  {m.moduleId}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {(ansicht === "pfad" && current ? [current] : []).map((mod) => {
        const modulNext = mod.blocks.flatMap((b) => b.units).find((u) => u.status !== "done");
        return (
          <section
            key={mod.moduleId}
            className="px-6 pt-8 md:px-12"
            data-module-state={mod.units ? "mit-einheiten" : "leer"}
          >
            <h2
              className="mb-2 text-lg font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {mod.moduleId} · {mod.moduleTitle}
            </h2>
            {mod.units === 0 ? (
              <div
                tabIndex={0}
                role="group"
                aria-label={`Modul ${mod.moduleId}, ${mod.moduleTitle}: Noch keine Einheiten. Hier kannst du noch nichts starten.`}
                data-testid="modul-leer"
                className={`${tile} min-h-11 rounded-[var(--radius-md)] ${focus}`}
              >
                <p
                  className="text-[15px] font-semibold leading-5 text-[var(--color-text-primary)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Noch keine Einheiten
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Dieses Modul wird nach und nach gefüllt. Sobald Einheiten veröffentlicht sind, kannst du hier starten.
                </p>
              </div>
            ) : null}
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
                {/* N5 Karte: Punkte fertig / jetzt / offen auf einer Achse */}
                <ol className="bento-tile !gap-0">
                  {block.units.map((unit, i) => (
                    <li key={unit.id}>
                      <PathNode
                        state={NODE_STATE[unit.status]}
                        indexLabel={unit.indexLabel}
                        title={unit.title}
                        last={i === block.units.length - 1}
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
            {modulNext ? (
              <Link
                href={`/einheit/${modulNext.id}`}
                className={`mt-2 flex min-h-[50px] items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-brand-accent)] px-4 text-base font-semibold text-[var(--color-bg-hero)] ${focus}`}
              >
                Einheit starten
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </section>
        );
      })}

      </main>

      <BottomNav />
    </MobileShell>
  );
}
