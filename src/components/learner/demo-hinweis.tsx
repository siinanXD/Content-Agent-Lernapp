"use client";

import { usePathname } from "next/navigation";
import { isDemoMode } from "@/lib/learner/demo-modus";
import { useAfterMount } from "@/lib/use-after-mount";

/** Kennzeichnet den Beispielmodus (SIN-408) auf jeder Ansicht. Die Gruppenansicht hat ihren eigenen Hinweis (SIN-385). */
export function DemoHinweis() {
  const aktiv = useAfterMount(isDemoMode, false);
  const pathname = usePathname();
  if (!aktiv || pathname.startsWith("/ausbilder")) return null;
  return (
    <p
      role="note"
      className="mx-4 mt-4 rounded-[var(--radius-xl)] bg-[var(--color-bg-hint)] px-4 py-3 text-[13px] leading-[17px] text-[var(--color-text-hint)]"
    >
      Beispiel: Die Zahlen und Ergebnisse dieser Ansicht sind erfunden. Es wird nichts gespeichert.{" "}
      {/* Harte Navigation: Eine weiche liest die alte Adresse und setzt das Flag wieder (SIN-1514). */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/?demo=0"
        className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        Beispiel beenden
      </a>
    </p>
  );
}
