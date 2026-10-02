"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Progress } from "@/components/ui/progress";
import { loadSession, type LearnerSession } from "@/lib/learner/session";

export default function ProfilPage() {
  const [session, setSession] = useState<LearnerSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

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
            <Progress value={pct} />
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            {daysDone} von {daysTotal} Tagen · {pct} % des Plans
          </p>
        </div>

        <MetaRow label="Beruf" value={session?.keyword ?? "Maschinen- und Anlagenführer"} />
        <MetaRow label="Variante" value={variantLabel} />
        <MetaRow label="Serie" value={`${session?.streakDays ?? 7} Tage am Stück`} />
        <MetaRow
          label="Punkte gesamt"
          value={(session?.totalPoints ?? 1840).toLocaleString("de-DE")}
        />
        <MetaRow label="Nächste Prüfungsthemen" value="Sicherheit, Fertigungstechnik" />

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Barrierefreiheit
          </p>
          <p className="mt-2 text-sm leading-5 text-[var(--color-text-secondary)]">
            Einfache Sprache und Vorlesen können hier geschaltet werden (WCAG
            2.2 AA).
          </p>
        </div>
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
