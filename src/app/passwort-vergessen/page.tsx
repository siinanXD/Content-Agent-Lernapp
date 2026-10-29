"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { TextField } from "@/components/ui/text-field";
import { AuthSeite, Fehler, Hinweis, authLink } from "@/components/auth/auth-seite";
import { getBrowserSupabase } from "@/lib/auth/browser-client";
import { mailFehlerSichtbar, mailLink, pruefeEmail } from "@/lib/auth/anmeldung";

type Status = "offen" | "sendet" | "gesendet" | "nicht-eingerichtet";

/** Passwort vergessen (SIN-1197): Link per E-Mail, der auf `/passwort-neu` der eigenen Origin zeigt. */
export default function PasswortVergessenPage() {
  const [status, setStatus] = useState<Status>("offen");
  const [fehler, setFehler] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const problem = pruefeEmail(email);
    if (problem) return setFehler(problem);
    const client = await getBrowserSupabase();
    if (!client) return setStatus("nicht-eingerichtet");
    setStatus("sendet");
    setFehler("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: mailLink(window.location.origin, "/passwort-neu"),
      });
      if (mailFehlerSichtbar(error)) throw error;
      // Immer dieselbe Antwort: niemand soll prüfen können, welche Adressen ein Konto haben.
      setStatus("gesendet");
    } catch {
      setStatus("offen");
      setFehler("Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
    }
  }

  return (
    <AuthSeite titel="Passwort vergessen" intro="Wir schicken Ihnen einen Link, mit dem Sie ein neues Passwort festlegen.">
      {status === "gesendet" ? (
        <Hinweis>Wenn zu dieser Adresse ein Konto besteht, ist der Link unterwegs. Bitte öffnen Sie ihn auf diesem Gerät.</Hinweis>
      ) : status === "nicht-eingerichtet" ? (
        <StateView kind="fehler" title="Anmeldung nicht eingerichtet" text="Bitte später erneut versuchen." />
      ) : (
        <form onSubmit={submit} className="bento-tile !gap-4">
          <TextField label="E-Mail" id="email" name="email" type="email" autoComplete="email" required />
          {fehler ? <Fehler>{fehler}</Fehler> : null}
          <Button type="submit" disabled={status === "sendet"}>
            {status === "sendet" ? "Wird gesendet …" : "Link schicken"}
          </Button>
        </form>
      )}
      <Link href="/anmelden" className={authLink}>
        Zurück zur Anmeldung
      </Link>
    </AuthSeite>
  );
}
