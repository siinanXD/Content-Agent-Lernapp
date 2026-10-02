"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/learner/mobile-shell";
import { PLAYABLE_TODAY } from "@/lib/learner/playable-path";
import { loadSession, type LearnerSession } from "@/lib/learner/session";

export default function ErgebnisPage() {
  const [session, setSession] = useState<LearnerSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
  }, []);

  const result = session?.lastResult;
  const title = result?.unitTitle ?? "Elektrische Gefahren";
  const correct = result?.correct ?? 5;
  const total = result?.total ?? 6;
  const points = result?.points ?? 120;

  return (
    <MobileShell>
      <section className="bg-gradient-to-br from-[var(--color-bg-hero)] to-[var(--color-brand-primary)] px-7 pb-8 pt-14">
        <p className="text-sm text-[#d9e8ed]">Ergebnis</p>
        <h1
          className="mt-2 text-[30px] font-bold leading-9 text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Einheit geschafft
        </h1>
        <p className="mt-3 text-[15px] text-[var(--color-text-on-brand)]">
          {title} · {correct} von {total} richtig
        </p>
      </section>

      <section className="flex flex-col gap-3 px-6 py-6">
        <StatRow label="Punkte heute" value={`+${points}`} />
        <StatRow label="Serie" value={`${session?.streakDays ?? 7} Tage`} />
      </section>

      <section className="flex flex-1 flex-col gap-3 px-6 pb-8">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Morgen dran
          </p>
          <p
            className="mt-1 text-lg font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLAYABLE_TODAY.nextTitle}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Tagesziel bleibt: 4 Einheiten · ca. 30 Minuten
          </p>
        </div>
        <Link href="/einheit/unit-04" className="block">
          <Button>Weiter lernen</Button>
        </Link>
        <Link href="/lernpfad" className="block">
          <Button variant="secondary">Zum Lernpfad</Button>
        </Link>
      </section>
    </MobileShell>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-4">
      <span className="text-[15px] text-[var(--color-text-primary)]">{label}</span>
      <span
        className="text-xl font-medium text-[var(--color-brand-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </span>
    </div>
  );
}
