"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupForm } from "@/components/ausbilder/group-form";
import { InviteSection } from "@/components/ausbilder/invite-section";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { MobileShell } from "@/components/learner/mobile-shell";
import { getAccessToken, signOut } from "@/lib/auth/browser-client";
import {
  INACTIVE_DAYS,
  filterMembers,
  formatDate,
  initials,
  isInactive,
  lastActiveLabel,
  parseOverview,
  reminderMailto,
  summarize,
  toCsv,
  type MemberFilter,
  type MemberRow,
  type Overview,
} from "@/lib/ausbilder/overview";

type Load =
  | { kind: "laden" }
  | { kind: "anmelden" }
  | { kind: "ohne-gruppe" }
  | { kind: "fehler"; text: string }
  | { kind: "bereit"; overview: Overview };

const FILTERS: Array<{ id: MemberFilter; label: string }> = [
  { id: "alle", label: "Alle" },
  { id: "inaktiv", label: "Inaktiv" },
  { id: "unter-plan", label: "Unter Plan" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Screen 19 Gruppenübersicht · Ausbilder. Daten kommen über /api/ausbilder/gruppe (RLS: nur eigene Gruppe). */
export default function AusbilderPage() {
  const [load, setLoad] = useState<Load>({ kind: "laden" });
  const [filter, setFilter] = useState<MemberFilter>("alle");
  const [now] = useState(() => new Date());

  // `still`: Daten im Hintergrund auffrischen, ohne die Seite auf „Laden“ zu setzen (Formulare bleiben stehen).
  const reload = useCallback(async (still = false) => {
    if (!still) setLoad({ kind: "laden" });
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/ausbilder/gruppe", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      // Antwort immer ganz lesen, auch bei 401/404: sonst bleibt die Anfrage offen.
      const data: unknown = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) return setLoad({ kind: "anmelden" });
      if (res.status === 404) return setLoad({ kind: "ohne-gruppe" });
      const overview = res.ok ? parseOverview(data) : null;
      if (overview) return setLoad({ kind: "bereit", overview });
      const text = (data as { error?: string } | null)?.error;
      setLoad({ kind: "fehler", text: text ?? "Bitte versuchen Sie es noch einmal." });
    } catch {
      setLoad({ kind: "fehler", text: "Bitte versuchen Sie es noch einmal." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden beim Öffnen der Seite
    void reload();
  }, [reload]);

  if (load.kind !== "bereit") {
    return (
      <MobileShell wide>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Gruppenübersicht</h1>
          {load.kind === "laden" ? <StateView kind="laden" /> : null}
          {load.kind === "anmelden" ? (
            <StateView
              kind="leer"
              title="Bitte anmelden"
              text="Die Gruppenübersicht ist nur für Ausbilder mit Zugang."
            >
              <Link
                href="/anmelden"
                className={`inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3 text-base font-semibold text-[var(--color-text-on-brand)] ${focusRing}`}
              >
                Anmelden
              </Link>
            </StateView>
          ) : null}
          {load.kind === "ohne-gruppe" ? (
            <>
              <StateView
                kind="leer"
                title="Noch keine Gruppe"
                text="Legen Sie Ihre Gruppe an. Danach laden Sie die Teilnehmenden ein."
              />
              <GroupForm onCreated={() => void reload(true)} />
            </>
          ) : null}
          {load.kind === "fehler" ? (
            <StateView kind="fehler" text={load.text}>
              <Button variant="secondary" onClick={() => void reload()}>
                Erneut versuchen
              </Button>
            </StateView>
          ) : null}
        </main>
      </MobileShell>
    );
  }

  return (
    <Ansicht
      overview={load.overview}
      filter={filter}
      onFilter={setFilter}
      now={now}
      onInvited={() => void reload(true)}
    />
  );
}

function Ansicht({
  overview,
  filter,
  onFilter,
  now,
  onInvited,
}: {
  overview: Overview;
  filter: MemberFilter;
  onFilter: (f: MemberFilter) => void;
  now: Date;
  onInvited: () => void;
}) {
  const router = useRouter();
  const { group, members } = overview;
  const stats = useMemo(() => summarize(members, now), [members, now]);
  const visible = useMemo(
    () => filterMembers(members, filter, group, now),
    [members, filter, group, now],
  );

  function exportCsv() {
    const blob = new Blob([toCsv(members, now)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gruppe-${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MobileShell wide>
      <main className="flex flex-col gap-[var(--bento-gap)] px-4 pb-8 pt-10 md:gap-[var(--bento-gap-wide)] md:px-8">
        <header className="bento-tile bento-main !gap-1">
          <p className="bento-label">{group.name}</p>
          <h1
            className="text-[28px] font-bold leading-9 md:text-[48px] md:leading-[52px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Gruppenübersicht
          </h1>
          <p className="text-sm leading-[18px] text-[var(--color-text-soft-on-dark)]">
            {group.schwerpunkt}
            {group.examDate ? ` · Prüfung am ${formatDate(group.examDate)}` : ""}
          </p>
        </header>

        <section aria-label="Kennzahlen">
          <ul className="bento">
            <Kennzahl wert={String(stats.count)} label="Teilnehmende" />
            <Kennzahl wert={`${stats.avgPercent} %`} label="Ø Fortschritt" />
            <Kennzahl
              wert={String(stats.inactiveCount)}
              label={`seit ${INACTIVE_DAYS} Tagen inaktiv`}
            />
          </ul>
        </section>

        <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => onFilter(f.id)}
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium ${focusRing} ${
                filter === f.id
                  ? "bg-[var(--color-bg-hero)] text-[var(--color-text-on-brand)]"
                  : "border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <section aria-label="Teilnehmende">
          {visible.length === 0 ? (
            <StateView
              kind="leer"
              title={members.length === 0 ? "Noch keine Teilnehmenden" : "Niemand in diesem Filter"}
              text={
                members.length === 0
                  ? "Sobald Teilnehmende der Gruppe zugeordnet sind, erscheinen sie hier."
                  : "Wählen Sie „Alle“, um die ganze Gruppe zu sehen."
              }
            />
          ) : (
            <ul className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
              {visible.map((m, i) => (
                <Zeile key={m.id} m={m} now={now} erste={i === 0} />
              ))}
            </ul>
          )}
        </section>

        <InviteSection onInvited={onInvited} />

        <p className="rounded-[var(--radius-xl)] bg-[var(--color-bg-hint)] px-4 py-3 text-[13px] leading-[17px] text-[var(--color-text-hint)]">
          Die App bewertet keine Personen. Sie zeigt nur Fortschritt und
          Lernzeit. Entscheidungen treffen Sie.
        </p>

        <div className="flex flex-col gap-2.5 md:max-w-[420px]">
          <a
            href={reminderMailto(group)}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-semibold text-[var(--color-text-on-brand)] hover:opacity-95 ${focusRing}`}
          >
            Erinnerung senden
          </a>
          <p className="text-xs leading-4 text-[var(--color-text-secondary)]">
            Öffnet einen E-Mail-Entwurf. Gesendet wird erst, wenn Sie ihn
            selbst abschicken.
          </p>
          <Button
            variant="secondary"
            onClick={exportCsv}
            disabled={members.length === 0}
            className="!text-[var(--color-brand-primary)] font-semibold"
          >
            Als CSV exportieren
          </Button>
          <Button
            variant="ghost"
            onClick={() => void signOut().then(() => router.push("/"))}
          >
            Abmelden
          </Button>
        </div>
      </main>
    </MobileShell>
  );
}

function Kennzahl({ wert, label }: { wert: string; label: string }) {
  return (
    <li className="bento-tile !gap-0.5 md:col-span-2">
      <span
        className="text-[32px] font-bold leading-10"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {wert}
      </span>
      <span className="bento-label">{label}</span>
    </li>
  );
}

function Zeile({ m, now, erste }: { m: MemberRow; now: Date; erste: boolean }) {
  const inaktiv = isInactive(m, now);
  return (
    <li
      className={`flex gap-3 px-4 py-3 md:items-center md:gap-6 md:px-6 ${erste ? "" : "border-t border-[var(--color-border-subtle)]"}`}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-avatar)] text-xs font-semibold"
      >
        {initials(m.name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[5px] md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1.4fr)_4rem] md:items-center md:gap-6">
        <div className="flex items-baseline justify-between gap-2 md:contents">
          <span
            className="truncate text-[15px] font-semibold leading-5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {m.name}
          </span>
          <span
            className="text-[13px] font-medium leading-[17px] text-[var(--color-text-secondary)] md:order-last md:text-right"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {m.progressPercent} %
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`Fortschritt ${m.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={m.progressPercent}
          className="h-1.5 w-full overflow-hidden rounded-[3px] bg-[var(--color-border-subtle)]"
        >
          <div
            className={`h-full rounded-[3px] ${inaktiv ? "bg-[var(--color-feedback-danger)]" : "bg-[var(--color-brand-primary)]"}`}
            style={{ width: `${m.progressPercent}%` }}
          />
        </div>
        <p
          className={`text-xs leading-4 ${inaktiv ? "text-[var(--color-feedback-danger)]" : "text-[var(--color-text-secondary)]"}`}
        >
          {lastActiveLabel(m, now)}
          {inaktiv ? " · Inaktiv · erinnern?" : ""}
        </p>
      </div>
    </li>
  );
}
