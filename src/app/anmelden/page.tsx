"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { StateView } from "@/components/ui/state-view";
import { MobileShell } from "@/components/learner/mobile-shell";
import { getBrowserSupabase } from "@/lib/auth/browser-client";

type Status = "offen" | "sendet" | "gesendet" | "nicht-eingerichtet" | "fehler";

/** Screen 20 (Teil „Schon Zugang?“): Anmelden per Magic-Link, kein Passwort. */
export default function AnmeldenPage() {
  const [status, setStatus] = useState<Status>("offen");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) return;
    const client = getBrowserSupabase();
    if (!client) {
      setStatus("nicht-eingerichtet");
      return;
    }
    setStatus("sendet");
    try {
      // Nur bestehende Konten (Demo-Zugang wird von uns angelegt). Die Antwort ist
      // immer dieselbe, damit niemand prüfen kann, welche Adressen ein Konto haben.
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/ausbilder`,
        },
      });
      setStatus(error && error.status !== 400 && error.status !== 422 ? "fehler" : "gesendet");
    } catch {
      setStatus("fehler");
    }
  }

  return (
    <MobileShell>
      <main className="flex flex-col gap-4 px-5 pb-8 pt-10">
        <h1
          className="text-[28px] font-bold leading-9"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Anmelden
        </h1>
        <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
          Wir schicken Ihnen einen Anmelde-Link. Kein Passwort nötig.
        </p>

        {status === "gesendet" ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 text-[15px] leading-5"
          >
            Wenn zu dieser Adresse ein Zugang besteht, ist der Link unterwegs.
            Bitte öffnen Sie ihn auf diesem Gerät.
          </p>
        ) : status === "nicht-eingerichtet" ? (
          <StateView
            kind="fehler"
            title="Anmeldung nicht eingerichtet"
            text="Bitte später erneut versuchen."
          />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <TextField
              label="E-Mail"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@bildungstraeger.de"
              required
            />
            {status === "fehler" ? (
              <p role="alert" className="text-sm text-[var(--color-feedback-danger)]">
                Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.
              </p>
            ) : null}
            <Button type="submit" variant="secondary" disabled={status === "sendet"}
              className="!text-[var(--color-brand-primary)]">
              {status === "sendet" ? "Wird gesendet …" : "Anmelde-Link senden"}
            </Button>
          </form>
        )}

        <p className="pt-2 text-sm text-[var(--color-text-secondary)]">
          Noch kein Zugang?{" "}
          <Link
            href="/demo"
            className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2"
          >
            Demo-Zugang anfragen
          </Link>
        </p>
      </main>
    </MobileShell>
  );
}
