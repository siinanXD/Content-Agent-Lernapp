"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StateView } from "@/components/ui/state-view";
import { MobileShell } from "@/components/learner/mobile-shell";

type Stand = "laden" | "bestaetigt" | "offen" | "unbekannt";

/** Bestätigung nach Stripe Checkout (SIN-771): fragt den Stand der Testsitzung ab. */
export default function AboBestaetigungPage() {
  const [stand, setStand] = useState<Stand>("laden");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id") ?? "";
    fetch(`/api/abo/status?session_id=${encodeURIComponent(id)}`)
      .then((r) => r.json() as Promise<{ status: Stand }>)
      .then((j) => setStand(j.status))
      .catch(() => setStand("unbekannt"));
  }, []);

  return (
    <MobileShell wide>
      <main className="mx-auto flex w-full flex-col gap-4 px-4 pb-8 pt-10 md:max-w-[640px]">
        {stand === "laden" ? (
          <StateView kind="laden" title="Abo wird geprüft" />
        ) : stand === "bestaetigt" ? (
          <StateView
            kind="leer"
            heading
            title="Abo im Testmodus bestätigt"
            text="Es wurde nichts abgebucht."
          />
        ) : (
          <StateView
            kind="fehler"
            heading
            title={stand === "offen" ? "Abo noch nicht abgeschlossen" : "Abo nicht bestätigt"}
            text="Bitte starten Sie das Abo noch einmal."
          />
        )}
        <Link
          href="/abo"
          className="inline-flex min-h-11 items-center justify-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2"
        >
          Zurück zum Abo
        </Link>
      </main>
    </MobileShell>
  );
}
