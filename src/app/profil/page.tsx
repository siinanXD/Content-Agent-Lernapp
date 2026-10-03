"use client";

import { useEffect, useState } from "react";
import { useA11y } from "@/components/a11y/a11y-provider";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Progress } from "@/components/ui/progress";
import { loadSession, type LearnerSession } from "@/lib/learner/session";
import { loadStack, stackSize } from "@/lib/learner/leitner";

export default function ProfilPage() {
  const [session, setSession] = useState<LearnerSession | null>(null);
  const [reviewSize, setReviewSize] = useState(0);
  const { prefs, setPrefs } = useA11y();

  useEffect(() => {
    setSession(loadSession());
    setReviewSize(stackSize(loadStack()));
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
            <Progress value={pct} label="Fortschritt bis zur Prüfung" />
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

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-3"
    >
      <span className="text-[15px] text-[var(--color-text-primary)]">{label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 accent-[var(--color-brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      />
    </label>
  );
}
