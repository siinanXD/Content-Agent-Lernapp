"use client";

import Link from "next/link";
import { useState } from "react";
import { ArchivKachel, focusRing } from "@/components/ausbilder/gruppen-kacheln";
import { gruppeAktion, useGruppen } from "@/components/ausbilder/use-gruppen";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { archivierte, type GroupSummary } from "@/lib/ausbilder/gruppen";

const secondaryLink = `inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-3.5 text-base font-semibold text-[var(--color-brand-primary)] ${focusRing}`;

/** G7 Archiv · Historie der Gruppen (SIN-415): lesen und wiederherstellen, solange Zugänge frei sind. */
export default function ArchivPage() {
  const { load, reload } = useGruppen();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function wiederherstellen(g: GroupSummary) {
    if (busy) return;
    setBusy(true);
    setStatus("");
    setError("");
    const fehler = await gruppeAktion(g.id, "wiederherstellen");
    setBusy(false);
    if (fehler) return setError(fehler);
    setStatus(`${g.name} ist wieder aktiv.`);
    await reload(true);
  }

  if (load.kind !== "bereit") {
    return (
      <MobileShell wide>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Archiv</h1>
          {load.kind === "laden" ? <StateView kind="laden" /> : null}
          {load.kind === "anmelden" ? (
            <StateView kind="leer" title="Bitte anmelden" text="Das Archiv ist nur für Ausbilder mit Zugang.">
              <Link href="/anmelden" className={secondaryLink}>
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

  const archiv = archivierte(load.data.groups);

  return (
    <MobileShell wide>
      <main className="flex flex-col gap-[var(--bento-gap)] px-4 pb-8 pt-10 md:gap-[var(--bento-gap-wide)] md:px-8">
        <header className="flex flex-col gap-1">
          <p className="bento-label">AUSBILDER</p>
          <h1 className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-display)" }}>
            Archiv
          </h1>
          <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
            Beendete Gruppen bleiben lesbar und belegen keine Zugänge.
          </p>
        </header>

        <p role="status" className="min-h-5 text-sm text-[var(--color-text-secondary)]">
          {status}
        </p>
        <p role="alert" className="text-sm text-[var(--color-feedback-danger)]">
          {error}
        </p>

        {archiv.length === 0 ? (
          <StateView
            kind="leer"
            title="Noch nichts im Archiv"
            text="Archivierte Gruppen erscheinen hier mit Fortschritt und Lernzeit."
          />
        ) : (
          <ul className="flex flex-col gap-[var(--bento-gap)] md:gap-[var(--bento-gap-wide)]">
            {archiv.map((g) => (
              <ArchivKachel key={g.id} g={g} busy={busy} onWiederherstellen={(x) => void wiederherstellen(x)} />
            ))}
          </ul>
        )}

        <p className="rounded-[var(--radius-xl)] bg-[var(--color-bg-hint)] px-4 py-3 text-[13px] leading-[17px] text-[var(--color-text-hint)]">
          Die App bewertet keine Personen. Das Archiv zeigt nur Fortschritt und Lernzeit.
        </p>

        <div className="md:max-w-[420px]">
          <Link href="/ausbilder/gruppen" className={secondaryLink}>
            Zurück zu meinen Gruppen
          </Link>
        </div>
      </main>
    </MobileShell>
  );
}
