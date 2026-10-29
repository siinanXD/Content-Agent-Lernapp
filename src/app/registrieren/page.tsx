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
import { mailFehlerSichtbar, mailLink, pruefeEmail, pruefePasswort, sicheresZiel } from "@/lib/auth/anmeldung";

type Status = "offen" | "sendet" | "gesendet" | "nicht-eingerichtet";

/**
 * Registrieren (SIN-1197): E-Mail, Passwort, Zustimmung zum Datenschutz. Das Konto hat keine Rolle und keine
 * Organisation (nur der Server setzt `app_metadata`): Es sieht keine Gruppendaten, bis ein Ausbilder einlädt.
 */
export default function RegistrierenPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("offen");
  const [fehler, setFehler] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    const email = String(daten.get("email") ?? "").trim();
    const password = String(daten.get("passwort") ?? "");
    const problem = pruefeEmail(email) ?? pruefePasswort(password);
    if (problem) return setFehler(problem);
    if (!daten.get("datenschutz")) return setFehler("Bitte stimmen Sie der Datenschutzerklärung zu.");

    const client = await getBrowserSupabase();
    if (!client) return setStatus("nicht-eingerichtet");
    setStatus("sendet");
    setFehler("");
    const weiter = sicheresZiel(new URLSearchParams(window.location.search).get("weiter")) ?? "/lernpfad";
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: mailLink(window.location.origin, weiter) },
      });
      if (mailFehlerSichtbar(error)) {
        setStatus("offen");
        return setFehler(
          error?.code === "weak_password"
            ? "Dieses Passwort ist zu schwach. Bitte wählen Sie ein anderes."
            : "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.",
        );
      }
      // Ohne Mailbestätigung im Projekt kommt gleich eine Sitzung zurück.
      if (data?.session) return router.push(weiter);
      setStatus("gesendet");
    } catch {
      setStatus("offen");
      setFehler("Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.");
    }
  }

  return (
    <AuthSeite titel="Registrieren" intro="Ein Konto für Ihren Lernfortschritt. Ihre Gruppe sieht Sie erst, wenn ein Ausbilder Sie einlädt.">
      {status === "gesendet" ? (
        <Hinweis>
          Wir haben Ihnen eine E-Mail geschickt. Bitte bestätigen Sie Ihre Adresse über den Link in der Mail. Danach
          können Sie sich anmelden.
        </Hinweis>
      ) : status === "nicht-eingerichtet" ? (
        <StateView kind="fehler" title="Anmeldung nicht eingerichtet" text="Bitte später erneut versuchen." />
      ) : (
        <form onSubmit={submit} className="bento-tile !gap-4">
          <TextField
            label="E-Mail"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@beispiel.de"
            required
          />
          <PasswortFeld id="passwort" autoComplete="new-password" minLength={8} />
          <label className="flex items-center text-sm leading-5">
            <input type="checkbox" name="datenschutz" required className="checkbox-44 -ml-3" />
            <span>
              Ich habe die{" "}
              <Link href="/datenschutz" className="font-semibold underline underline-offset-2">
                Datenschutzerklärung
              </Link>{" "}
              gelesen und stimme zu.
            </span>
          </label>
          {fehler ? <Fehler>{fehler}</Fehler> : null}
          <Button type="submit" disabled={status === "sendet"}>
            {status === "sendet" ? "Wird gesendet …" : "Registrieren"}
          </Button>
        </form>
      )}

      <p className="pt-2 text-sm text-[var(--color-text-secondary)]">
        Schon ein Konto?{" "}
        <Link href="/anmelden" className={authLink}>
          Anmelden
        </Link>
      </p>
    </AuthSeite>
  );
}
