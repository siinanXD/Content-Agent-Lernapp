"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/learner/mobile-shell";
import { PLAYABLE_TODAY } from "@/lib/learner/playable-path";
import { loadSession } from "@/lib/learner/session";
import { useAfterMount } from "@/lib/use-after-mount";
import type { TrafficLight } from "@/lib/content/didaktik";

const lightClass: Record<TrafficLight, string> = {
  green: "bg-[var(--color-feedback-success)] text-white",
  yellow: "bg-[#c4922a] text-white",
  red: "bg-[var(--color-feedback-danger)] text-white",
};

export default function ErgebnisPage() {
  const session = useAfterMount(loadSession, null);

  const result = session?.lastResult;
  const title = result?.unitTitle ?? "Elektrische Gefahren";
  const correct = result?.correct ?? 5;
  const total = result?.total ?? 6;
  const points = result?.points ?? 120;
  const kind = result?.kind ?? "unit";
  const areaResults = result?.areaResults ?? [];

  const headline =
    kind === "exam"
      ? "Prüfung ausgewertet"
      : kind === "review"
        ? "Wiederholung geschafft"
        : "Einheit geschafft";

  return (
    <MobileShell>
      <section className="bg-gradient-to-br from-[var(--color-bg-hero)] to-[var(--color-brand-primary)] px-7 pb-8 pt-14">
        <p className="text-sm text-[#d9e8ed]">Ergebnis</p>
        <h1
          className="mt-2 text-[30px] font-bold leading-9 text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {headline}
        </h1>
        <p className="mt-3 text-[15px] text-[var(--color-text-on-brand)]">
          {result?.partTitle ? `${result.partTitle} · ` : ""}
          {title} · {correct} von {total} richtig
        </p>
      </section>

      <section className="flex flex-col gap-3 px-6 py-6">
        <StatRow label="Punkte heute" value={`+${points}`} />
        <StatRow label="Serie" value={`${session?.streakDays ?? 7} Tage`} />
      </section>

      {areaResults.length > 0 ? (
        <section className="px-6 pb-4" aria-label="Ergebnis je Prüfungsgebiet">
          <h2
            className="mb-3 text-lg font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ampel je Gebiet
          </h2>
          <ul className="flex flex-col gap-2">
            {areaResults.map((a) => (
              <li
                key={a.areaId}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {a.title}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {a.correct}/{a.total} · {Math.round(a.ratio * 100)}%
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium ${lightClass[a.light]}`}
                >
                  {a.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
            Unter 60 % (rot): zugehörige Einheiten im Lernpfad wiederholen. Keine
            KI-Note für offene Aufgaben.
          </p>
        </section>
      ) : null}

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
            Tagesziel: fällige Wiederholungen zuerst, dann neue Einheiten
          </p>
        </div>
        <Link href="/wiederholung" className="block">
          <Button variant="secondary">Zur Wiederholung</Button>
        </Link>
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
