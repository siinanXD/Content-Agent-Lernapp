"use client";

import Link from "next/link";
import { useState } from "react";
import { ArchiveSheet } from "@/components/ausbilder/archive-sheet";
import { GroupForm } from "@/components/ausbilder/group-form";
import { focusRing, GruppenKachel, ZugaengeKachel } from "@/components/ausbilder/gruppen-kacheln";
import { gruppeAktion, useGruppen } from "@/components/ausbilder/use-gruppen";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { aktiveGruppenText, aktive, archivierte, type GroupSummary } from "@/lib/ausbilder/gruppen";

const primaryLink = `inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-semibold text-[var(--color-text-on-brand)] ${focusRing}`;
const secondaryLink = `inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-3.5 text-base font-semibold text-[var(--color-brand-primary)] ${focusRing}`;

/** G5 Meine Gruppen · Ausbilder (SIN-415): aktive Gruppen, Zugänge „x von y vergeben“, Archivieren. */
export default function MeineGruppenPage() {
  const { load, reload } = useGruppen();
  const [neu, setNeu] = useState(false);
  const [zuArchivieren, setZuArchivieren] = useState<GroupSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function archivieren() {
    if (!zuArchivieren || busy) return;
    setBusy(true);
    setError("");
    const fehler = await gruppeAktion(zuArchivieren.id, "archivieren");
    setBusy(false);
    if (fehler) return setError(fehler);
    setStatus(`${zuArchivieren.name} ist jetzt im Archiv.`);
    setZuArchivieren(null);
    await reload(true);
  }

  if (load.kind !== "bereit") {
    return (
      <MobileShell wide>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Meine Gruppen</h1>
          {load.kind === "laden" ? <StateView kind="laden" /> : null}
          {load.kind === "anmelden" ? (
            <StateView kind="leer" title="Bitte anmelden" text="Meine Gruppen ist nur für Ausbilder mit Zugang.">
              <Link href="/anmelden" className={primaryLink}>
                Anmelden
              </Link>
            </StateView>
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

  const { groups, zugaenge } = load.data;
  const aktiv = aktive(groups);
  const archiv = archivierte(groups);

  return (
    <MobileShell wide>
      <main className="flex flex-col gap-[var(--bento-gap)] px-4 pb-8 pt-10 md:gap-[var(--bento-gap-wide)] md:px-8">
        <header className="flex flex-col gap-1">
          <p className="bento-label">AUSBILDER</p>
          <h1 className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-display)" }}>
            Meine Gruppen
          </h1>
          <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
            {aktiveGruppenText(zugaenge?.organisation ?? null, aktiv.length)}
          </p>
        </header>

        {zugaenge ? <ZugaengeKachel zugaenge={zugaenge} /> : null}

        <p role="status" className="min-h-5 text-sm text-[var(--color-text-secondary)]">
          {status}
        </p>

        {aktiv.length === 0 ? (
          <StateView
            kind="leer"
            title="Noch keine aktive Gruppe"
            text="Legen Sie eine Gruppe an. Danach laden Sie die Teilnehmenden ein."
          />
        ) : (
          <ul className="flex flex-col gap-[var(--bento-gap)] md:gap-[var(--bento-gap-wide)]">
            {aktiv.map((g) => (
              <GruppenKachel
                key={g.id}
                g={g}
                onArchivieren={(gruppe) => {
                  setError("");
                  setStatus("");
                  setZuArchivieren(gruppe);
                }}
              />
            ))}
          </ul>
        )}

        {neu ? (
          <GroupForm
            onCreated={() => {
              setNeu(false);
              setStatus("Die Gruppe ist angelegt.");
              void reload(true);
            }}
          />
        ) : null}

        <div className="flex flex-col gap-2.5 md:max-w-[420px]">
          {neu ? null : (
            <Button onClick={() => setNeu(true)} className="font-semibold">
              Neue Gruppe anlegen
            </Button>
          )}
          <Link href="/ausbilder/archiv" className={secondaryLink}>
            Archiv ansehen ({archiv.length})
          </Link>
        </div>
      </main>

      {zuArchivieren ? (
        <ArchiveSheet
          group={zuArchivieren}
          mitKontingent={zugaenge !== null}
          busy={busy}
          error={error}
          onConfirm={() => void archivieren()}
          onCancel={() => setZuArchivieren(null)}
        />
      ) : null}
    </MobileShell>
  );
}
