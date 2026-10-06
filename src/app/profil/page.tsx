"use client";

import { useA11y } from "@/components/a11y/a11y-provider";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { ToggleRow } from "@/components/ui/toggle-row";
import { loadSession } from "@/lib/learner/session";
import { loadStack, stackSize, type LeitnerStack } from "@/lib/learner/leitner";
import {
  formatDays,
  loadLearningSummary,
  type LearningSummary,
} from "@/lib/learner/streak";
import { useAfterMount } from "@/lib/use-after-mount";

export default function ProfilPage() {
  const session = useAfterMount(loadSession, null);
  const stack = useAfterMount<LeitnerStack | null>(loadStack, null);
  const reviewSize = stack ? stackSize(stack) : 0;
  const summary = useAfterMount<LearningSummary | "laden" | "fehler">(
    loadLearningSummary,
    "laden",
  );
  const streak =
    summary === "laden" || summary === "fehler"
      ? { days: 0, learnedToday: false, previousDays: 0 }
      : summary.streak;
  const { prefs, setPrefs } = useA11y();

  const daysDone = 15;
  const daysTotal = session?.variant === "weiterbildung" ? 60 : 40;
  const pct = Math.round((daysDone / daysTotal) * 100);
  const variantLabel =
    session?.variant === "weiterbildung"
      ? "Weiterbildung 3 Monate"
      : "Prüfungsvorbereitung 2 Monate";

  return (
    <MobileShell>
      <header className="px-6 pb-4 pt-12">
        <h1
          className="text-[28px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Profil
        </h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
          Lernender MAF ·{" "}
          {session?.variant === "weiterbildung"
            ? "Weiterbildung"
            : "Prüfungsvorbereitung"}
        </p>
      </header>

      <section className="flex flex-1 flex-col gap-5 px-6 pb-6">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-4">
          <p
            className="text-base font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Fortschritt bis zur Prüfung
          </p>
          <div className="mt-3">
            <Progress value={pct} label="Fortschritt bis zur Prüfung" />
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            {daysDone} von {daysTotal} Tagen · {pct} % des Plans
          </p>
        </div>

        <MetaRow label="Beruf" value={session?.keyword ?? "Maschinen- und Anlagenführer"} />
        <MetaRow label="Variante" value={variantLabel} />
        <MetaRow label="Serie" value={`${formatDays(streak.days)} am Stück`} />
        {streak.previousDays > 0 ? (
          <MetaRow label="Letzte Serie" value={formatDays(streak.previousDays)} />
        ) : null}
        <MetaRow
          label="Punkte gesamt"
          value={(session?.totalPoints ?? 1840).toLocaleString("de-DE")}
        />
        <MetaRow label="Nächste Prüfungsthemen" value="Sicherheit, Fertigungstechnik" />
        <MetaRow label="Wiederholungsstapel" value={`${reviewSize} Fragen`} />
        <MetaRow
          label="Prüfungsreife (Demo)"
          value={
            session?.lastResult?.areaResults?.length
              ? session.lastResult.areaResults
                  .map((a) => `${a.areaId}: ${a.label}`)
                  .join(" · ")
              : "Noch keine Prüfung absolviert"
          }
        />

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Barrierefreiheit
          </p>
          <p className="mt-2 text-sm leading-5 text-[var(--color-text-secondary)]">
            Schalter für einfache Sprache und Vorlesen (WCAG 2.2 AA). Offline
            bleibt die geladene App-Hülle nutzbar.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <ToggleRow
              id="simple-language"
              label="Einfache Sprache"
              checked={prefs.simpleLanguage}
              onChange={(checked) =>
                setPrefs({ ...prefs, simpleLanguage: checked })
              }
            />
            <ToggleRow
              id="read-aloud"
              label="Vorlesen"
              checked={prefs.readAloud}
              onChange={(checked) => setPrefs({ ...prefs, readAloud: checked })}
            />
          </div>
        </div>

        <Link
          href="/einstellungen"
          className="flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 text-sm font-medium text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Einstellungen
        </Link>
      </section>

      <BottomNav />
    </MobileShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--color-border-subtle)] pb-3">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 text-[15px] text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

