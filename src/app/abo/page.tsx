"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { MobileShell } from "@/components/learner/mobile-shell";

type Status = "offen" | "sendet" | "nicht-eingerichtet" | "fehler";

/** Abo im Testmodus (SIN-771): Weiterleitung zu Stripe Checkout, Rückkehr auf /abo/bestaetigung. */
export default function AboPage() {
  const [status, setStatus] = useState<Status>("offen");

  async function start() {
    setStatus("sendet");
    try {
      const res = await fetch("/api/abo/start", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.assign(json.url);
        return;
      }
      setStatus(res.status === 503 ? "nicht-eingerichtet" : "fehler");
    } catch {
      setStatus("fehler");
    }
  }

  return (
    <MobileShell wide>
      <main className="mx-auto flex w-full flex-col gap-4 px-4 pb-8 pt-10 md:max-w-[640px]">
        <h1
          className="text-[32px] font-bold leading-10 md:text-[44px] md:leading-[48px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Abo
        </h1>
        <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
          Testmodus: Es wird nichts abgebucht. Bezahlt wird mit einer Teststeckkarte von Stripe.
        </p>
        {status === "nicht-eingerichtet" ? (
          <StateView
            kind="fehler"
            title="Abo noch nicht eingerichtet"
            text="Bitte später erneut versuchen."
          />
        ) : (
          <div className="bento-tile !gap-4">
            {status === "fehler" ? (
              <p role="alert" className="text-sm text-[var(--color-feedback-danger)]">
                Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.
              </p>
            ) : null}
            <Button onClick={start} disabled={status === "sendet"}>
              {status === "sendet" ? "Wird geöffnet …" : "Abo im Testmodus starten"}
            </Button>
          </div>
        )}
      </main>
    </MobileShell>
  );
}
