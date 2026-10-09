"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { TextField } from "@/components/ui/text-field";
import { checkZugangInput, parseZugangPreview, type ZugangPreview } from "@/lib/ausbilder/zugang";

type Load =
  | { kind: "laden" }
  | { kind: "ungueltig"; text: string }
  | { kind: "fehler"; text: string }
  | { kind: "bereit"; preview: ZugangPreview }
  | { kind: "gesendet"; mailSent: boolean };

const BAD_LINK = "Dieser Link ist nicht gültig oder wurde schon benutzt.";

/** G0 Zugang einlösen · Ausbilder (SIN-415): Einladungslink, E-Mail für den Anmelde-Link. */
export default function ZugangPage() {
  const [load, setLoad] = useState<Load>({ kind: "laden" });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code") ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Link prüfen beim Öffnen der Seite
    setCode(c);
    if (!c) return setLoad({ kind: "ungueltig", text: BAD_LINK });
    fetch(`/api/ausbilder/zugang?code=${encodeURIComponent(c)}`, { cache: "no-store" })
      .then(async (res) => {
        const body: unknown = await res.json().catch(() => null);
        const preview = res.ok ? parseZugangPreview(body) : null;
        if (preview) return setLoad({ kind: "bereit", preview });
        const text = (body as { error?: string } | null)?.error ?? BAD_LINK;
        setLoad(res.status === 404 ? { kind: "ungueltig", text } : { kind: "fehler", text });
      })
      .catch(() => setLoad({ kind: "fehler", text: "Bitte versuchen Sie es noch einmal." }));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const input = checkZugangInput({ code, email: new FormData(e.currentTarget).get("email") });
    if (!input.ok) return setError(input.error);
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/ausbilder/zugang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.value),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; mailSent?: boolean } | null;
      if (res.ok) return setLoad({ kind: "gesendet", mailSent: body?.mailSent !== false });
      setError(body?.error ?? "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
    } catch {
      setError("Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
    } finally {
      setBusy(false);
    }
  }

  if (load.kind === "laden") {
    return (
      <MobileShell wide>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Ihr Ausbilder-Zugang</h1>
          <StateView kind="laden" />
        </main>
      </MobileShell>
    );
  }

  if (load.kind === "ungueltig" || load.kind === "fehler") {
    return (
      <MobileShell wide>
        <main className="flex flex-1 flex-col justify-center">
          <h1 className="sr-only">Ihr Ausbilder-Zugang</h1>
          <StateView
            kind={load.kind === "fehler" ? "fehler" : "leer"}
            title={load.kind === "fehler" ? undefined : "Link nicht gültig"}
            text={load.text}
          >
            <Link
              href="/anmelden"
              className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2"
            >
              Schon einen Zugang? Anmelden
            </Link>
          </StateView>
        </main>
      </MobileShell>
    );
  }

  return (
    <MobileShell wide>
      <main className="mx-auto flex w-full flex-col gap-4 px-5 pb-10 pt-10 md:max-w-[640px]">
        <header className="flex flex-col gap-1">
          <p className="bento-label">EINLADUNG</p>
          <h1 className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-display)" }}>
            Ihr Ausbilder-Zugang
          </h1>
          {load.kind === "bereit" ? (
            <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
              {load.preview.organisation} hat einen Zugang für Sie eingerichtet.
            </p>
          ) : null}
        </header>

        {load.kind === "bereit" ? (
          <section aria-label="Kontingent" className="bento-tile bento-main">
            <p className="bento-label">Für Ihre Organisation</p>
            <dl className="flex gap-6">
              <div className="flex flex-col-reverse gap-0.5">
                <dt className="text-[13px] text-[var(--color-text-soft-on-dark)]">Ausbilder</dt>
                <dd className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-mono)" }}>
                  {load.preview.trainerQuota}
                </dd>
              </div>
              <div className="flex flex-col-reverse gap-0.5">
                <dt className="text-[13px] text-[var(--color-text-soft-on-dark)]">Azubi-Zugänge</dt>
                <dd className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-mono)" }}>
                  {load.preview.memberQuota}
                </dd>
              </div>
            </dl>
            <p className="text-sm leading-[18px] text-[var(--color-text-soft-on-dark)]">
              Gruppen legen Sie selbst an. Jeder Azubi belegt einen Zugang.
            </p>
          </section>
        ) : null}

        {load.kind === "gesendet" ? (
          <p
            role="status"
            className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 text-[15px] leading-5"
          >
            {load.mailSent
              ? "Der Zugang ist aktiv. Der Anmelde-Link ist unterwegs. Bitte öffnen Sie ihn auf diesem Gerät."
              : "Der Zugang ist aktiv. Die E-Mail konnte nicht gesendet werden. Melden Sie sich mit derselben Adresse an."}{" "}
            <Link
              href="/anmelden"
              className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline underline-offset-2"
            >
              Zur Anmeldung
            </Link>
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="bento-tile !gap-4">
            <TextField
              label="E-Mail für den Anmelde-Link"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@beispiel-traeger.de"
              required
            />
            <p role="alert" className="min-h-5 text-sm text-[var(--color-feedback-danger)]">
              {error}
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? "Wird aktiviert …" : "Zugang aktivieren"}
            </Button>
          </form>
        )}

        <p className="rounded-[var(--radius-xl)] bg-[var(--color-bg-hint)] px-4 py-3 text-[13px] leading-[17px] text-[var(--color-text-hint)]">
          Kein Passwort. Sie bekommen einen Anmelde-Link per E-Mail.
        </p>
      </main>
    </MobileShell>
  );
}
