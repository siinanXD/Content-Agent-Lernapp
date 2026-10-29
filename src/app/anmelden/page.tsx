"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { TextField } from "@/components/ui/text-field";
import { AuthSeite, Fehler, Hinweis, authLink } from "@/components/auth/auth-seite";
import { PasswortFeld } from "@/components/auth/passwort-feld";
import { getBrowserSupabase } from "@/lib/auth/browser-client";
import { anmeldeFehler, mailLink, pruefeEmail, sicheresZiel, zielNachLogin } from "@/lib/auth/anmeldung";

type Status = "offen" | "sendet" | "gesendet" | "nicht-eingerichtet";

/** Wohin es nach dem Login geht: `?weiter=/seite`, sonst je nach Rolle. */
function weiterParam(): string | null {
  return sicheresZiel(new URLSearchParams(window.location.search).get("weiter"));
}

/** Screen 20 (Teil „Schon Zugang?“): E-Mail + Passwort, Google oder Anmelde-Link. */
export default function AnmeldenPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("offen");
  const [fehler, setFehler] = useState("");

  async function client() {
    const c = await getBrowserSupabase();
    if (!c) setStatus("nicht-eingerichtet");
    return c;
  }

  async function mitPasswort(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    const email = String(daten.get("email") ?? "").trim();
    const password = String(daten.get("passwort") ?? "");
    if (pruefeEmail(email)) return setFehler("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
    const c = await client();
    if (!c) return;
    setStatus("sendet");
    setFehler("");
    try {
      const { data, error } = await c.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("offen");
        return setFehler(anmeldeFehler(error));
      }
      router.push(zielNachLogin(data.user?.app_metadata?.role, weiterParam()));
    } catch {
      setStatus("offen");
      setFehler(anmeldeFehler({}));
    }
  }

  async function mitGoogle() {
    const c = await client();
    if (!c) return;
    setFehler("");
    const { error } = await c.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: mailLink(window.location.origin, weiterParam() ?? "/lernpfad") },
    });
    if (error) setFehler(anmeldeFehler(error));
  }

  async function mitLink(e: { currentTarget: HTMLButtonElement }) {
    const email = String(new FormData(e.currentTarget.form ?? undefined).get("email") ?? "").trim();
    if (pruefeEmail(email)) return setFehler("Bitte geben Sie oben Ihre E-Mail-Adresse ein.");
    const c = await client();
    if (!c) return;
    setStatus("sendet");
    setFehler("");
    try {
      // Nur bestehende Konten (Ausbilder-Zugänge legen wir an). Die Antwort ist immer dieselbe,
      // damit niemand prüfen kann, welche Adressen ein Konto haben.
      const { error } = await c.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: mailLink(window.location.origin, weiterParam() ?? "/ausbilder/gruppen"),
        },
      });
      if (error && error.status !== 400 && error.status !== 422) throw error;
      setStatus("gesendet");
    } catch {
      setStatus("offen");
      setFehler(anmeldeFehler({}));
    }
  }

  return (
    <AuthSeite titel="Anmelden" intro="Mit E-Mail und Passwort, mit Google oder mit einem Link per E-Mail.">
      {status === "gesendet" ? (
        <Hinweis>
          Wenn zu dieser Adresse ein Zugang besteht, ist der Link unterwegs. Bitte öffnen Sie ihn auf diesem Gerät.
        </Hinweis>
      ) : status === "nicht-eingerichtet" ? (
        <StateView kind="fehler" title="Anmeldung nicht eingerichtet" text="Bitte später erneut versuchen." />
      ) : (
        <form onSubmit={mitPasswort} className="bento-tile !gap-4">
            <TextField
              label="E-Mail"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@bildungstraeger.de"
              required
            />
            <PasswortFeld id="passwort" autoComplete="current-password" />
            {fehler ? <Fehler>{fehler}</Fehler> : null}
            <Button type="submit" disabled={status === "sendet"}>
              {status === "sendet" ? "Wird gesendet …" : "Anmelden"}
            </Button>
            <Link href="/passwort-vergessen" className={authLink}>
              Passwort vergessen?
            </Link>
            <Button type="button" variant="secondary" onClick={mitGoogle} className="!text-[var(--color-brand-primary)]">
              Mit Google anmelden
            </Button>
            <Button type="button" variant="secondary" onClick={mitLink} disabled={status === "sendet"} className="!text-[var(--color-brand-primary)]">
              Link per E-Mail schicken
            </Button>
        </form>
      )}

      <p className="pt-2 text-sm text-[var(--color-text-secondary)]">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className={authLink}>
          Registrieren
        </Link>
        {" · "}
        <Link href="/demo" className={authLink}>
          Demo-Zugang anfragen
        </Link>
        {" · "}
        <Link href="/abo" prefetch={false} className={authLink}>
          Abo im Testmodus
        </Link>
      </p>
    </AuthSeite>
  );
}
