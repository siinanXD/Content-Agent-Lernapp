"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { MobileShell } from "@/components/learner/mobile-shell";
import { SCHWERPUNKTE } from "@/lib/learner/onboarding";
import { DEMO_HREF } from "@/lib/ausbilder/demo";
import { DEMO_LERNEN_HREF } from "@/lib/learner/demo-modus";
import type { DemoField } from "@/lib/demo/demo-request";

type Status = "offen" | "sendet" | "fertig" | "fehler";

/** Screen 20 Demo-Zugang anfragen. Speichert die Anfrage über /api/demo (Einwilligung Pflicht). */
export default function DemoPage() {
  const [status, setStatus] = useState<Status>("offen");
  const [fields, setFields] = useState<Partial<Record<DemoField, string>>>({});
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sendet");
    setFields({});
    setMessage("");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisation: form.get("organisation"),
          contactName: form.get("contactName"),
          email: form.get("email"),
          participants: form.get("participants"),
          schwerpunkt: form.get("schwerpunkt"),
          consent: form.get("consent") === "on",
          website: form.get("website"),
        }),
      });
      if (res.ok) {
        setStatus("fertig");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Partial<Record<DemoField, string>>;
      };
      setFields(data.fields ?? {});
      setMessage(data.error ?? "Das hat nicht geklappt. Bitte versuche es noch einmal.");
      setStatus("fehler");
    } catch {
      setMessage("Keine Verbindung. Bitte versuche es noch einmal.");
      setStatus("fehler");
    }
  }

  if (status === "fertig") {
    return (
      <MobileShell wide>
        <main className="mx-auto flex w-full flex-col gap-4 px-4 pb-8 pt-10 md:max-w-[640px]">
          <h1
            className="text-[32px] font-bold leading-10 md:text-[44px] md:leading-[48px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Danke für Ihre Anfrage.
          </h1>
          <p role="status" className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
            Wir melden uns innerhalb eines Werktags und richten den Demo-Zugang ein.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-5 py-3.5 text-base font-semibold text-[var(--color-brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Zur Startseite
          </Link>
        </main>
      </MobileShell>
    );
  }

  return (
    <MobileShell wide>
      <main className="mx-auto flex w-full flex-col gap-4 px-4 pb-8 pt-10 md:max-w-[640px]">
        <h1
          className="text-[32px] font-bold leading-10 md:text-[44px] md:leading-[48px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Demo-Zugang anfragen
        </h1>
        <p className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
          Für bis zu 10 Teilnehmende, zwei Wochen kostenlos. Wir melden uns
          innerhalb eines Werktags.
        </p>

        <p className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
          Erst ansehen? Die Gruppenansicht gibt es mit Beispieldaten, ohne Konto.{" "}
          <Link
            href={DEMO_HREF}
            className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2"
          >
            Beispielansicht öffnen
          </Link>
        </p>
        <p className="text-[15px] leading-5 text-[var(--color-text-secondary)]">
          Auch die Lernansichten (Lernpfad, Ergebnis, Wiederholung, Profil)
          gibt es mit Beispieldaten.{" "}
          <Link
            href={DEMO_LERNEN_HREF}
            className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2"
          >
            Lernpfad als Beispiel öffnen
          </Link>
        </p>

        <form onSubmit={submit} noValidate className="bento-tile !gap-4">
          <TextField
            label="Bildungsträger"
            id="organisation"
            name="organisation"
            autoComplete="organization"
            required
            error={fields.organisation}
          />
          <TextField
            label="Ansprechperson"
            id="contactName"
            name="contactName"
            autoComplete="name"
            placeholder="Vor- und Nachname"
            required
            error={fields.contactName}
          />
          <TextField
            label="Dienstliche E-Mail"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@bildungstraeger.de"
            required
            error={fields.email}
          />
          <TextField
            label="Teilnehmende (ca.)"
            id="participants"
            name="participants"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            defaultValue={10}
            required
            error={fields.participants}
          />
          <label className="flex flex-col gap-2" htmlFor="schwerpunkt">
            <span className="text-sm font-medium">Schwerpunkt</span>
            <select
              id="schwerpunkt"
              name="schwerpunkt"
              defaultValue={SCHWERPUNKTE[0]?.title}
              className="min-h-11 w-full rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 text-base focus-visible:border-[var(--color-brand-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              {SCHWERPUNKTE.map((s) => (
                <option key={s.id} value={s.title}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          {/* Honigtopf gegen Bots: für Menschen unsichtbar und nicht erreichbar. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-0 text-sm leading-[17px] text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                name="consent"
                required
                aria-invalid={fields.consent ? true : undefined}
                aria-describedby={fields.consent ? "consent-error" : undefined}
                className="checkbox-44 -ml-3"
              />
              <span className="py-3.5">
                Ich bin einverstanden, dass meine Angaben zur Bearbeitung der
                Anfrage gespeichert werden (
                <Link href="/datenschutz" className="underline underline-offset-2">
                  Datenschutz
                </Link>
                ).
              </span>
            </label>
            {fields.consent ? (
              <p id="consent-error" className="text-sm text-[var(--color-feedback-danger)]">
                {fields.consent}
              </p>
            ) : null}
          </div>

          {status === "fehler" && message ? (
            <p role="alert" className="text-sm text-[var(--color-feedback-danger)]">
              {message}
            </p>
          ) : null}

          <Button type="submit" disabled={status === "sendet"}>
            {status === "sendet" ? "Wird gesendet …" : "Demo-Zugang anfragen"}
          </Button>
        </form>

        <p className="pt-2 text-sm text-[var(--color-text-secondary)]">
          Schon Zugang?{" "}
          <Link
            href="/anmelden"
            className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2"
          >
            Anmelden
          </Link>
        </p>
      </main>
    </MobileShell>
  );
}
