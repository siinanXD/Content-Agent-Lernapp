"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { AuthSeite, Fehler, Hinweis, authLink } from "@/components/auth/auth-seite";
import { PasswortFeld } from "@/components/auth/passwort-feld";
import { getBrowserSupabase } from "@/lib/auth/browser-client";
import { pruefePasswort, zielNachLogin } from "@/lib/auth/anmeldung";

type Status = "pruefen" | "bereit" | "ungueltig" | "sendet" | "nicht-eingerichtet";

/** Neues Passwort (SIN-1197): Der Link aus der Mail öffnet diese Seite mit einer Sitzung; ohne sie ist der Link ungültig. */
export default function PasswortNeuPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("pruefen");
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    let aktiv = true;
    let abmelden: (() => void) | undefined;
    getBrowserSupabase().then(async (client) => {
      if (!aktiv) return;
      if (!client) return setStatus("nicht-eingerichtet");
      // Die Bibliothek wertet den Link beim Start aus und meldet danach PASSWORD_RECOVERY bzw. legt die Sitzung an.
      const { data: sub } = client.auth.onAuthStateChange((event, session) => {
        if (aktiv && session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setStatus("bereit");
      });
      abmelden = () => sub.subscription.unsubscribe();
      const { data } = await client.auth.getSession();
      if (aktiv) setStatus((s) => (data.session ? "bereit" : s === "pruefen" ? "ungueltig" : s));
    });
    return () => {
      aktiv = false;
      abmelden?.();
    };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    const neu = String(daten.get("passwort") ?? "");
    const problem = pruefePasswort(neu);
    if (problem) return setFehler(problem);
    if (neu !== String(daten.get("wiederholung") ?? "")) return setFehler("Die beiden Passwörter sind nicht gleich.");
    const client = await getBrowserSupabase();
    if (!client) return setStatus("nicht-eingerichtet");
    setStatus("sendet");
    setFehler("");
    try {
      const { data, error } = await client.auth.updateUser({ password: neu });
      if (error) throw error;
      router.push(zielNachLogin(data.user?.app_metadata?.role, null));
    } catch (err) {
      setStatus("bereit");
      setFehler(
        (err as { code?: string })?.code === "same_password"
          ? "Bitte wählen Sie ein anderes Passwort als bisher."
          : (err as { code?: string })?.code === "weak_password"
            ? "Dieses Passwort ist zu schwach. Bitte wählen Sie ein anderes."
            : "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.",
      );
    }
  }

  return (
    <AuthSeite titel="Neues Passwort" intro="Wählen Sie ein neues Passwort für Ihr Konto.">
      {status === "pruefen" ? (
        <Hinweis>Link wird geprüft …</Hinweis>
      ) : status === "ungueltig" ? (
        <>
          <StateView
            kind="fehler"
            title="Link nicht gültig"
            text="Dieser Link ist abgelaufen oder wurde schon benutzt. Bitte fordern Sie einen neuen an."
          />
          <Link href="/passwort-vergessen" className={authLink}>
            Neuen Link anfordern
          </Link>
        </>
      ) : status === "nicht-eingerichtet" ? (
        <StateView kind="fehler" title="Anmeldung nicht eingerichtet" text="Bitte später erneut versuchen." />
      ) : (
        <form onSubmit={submit} className="bento-tile !gap-4">
          <PasswortFeld id="passwort" label="Neues Passwort" autoComplete="new-password" minLength={8} />
          <PasswortFeld id="wiederholung" label="Neues Passwort wiederholen" autoComplete="new-password" minLength={8} />
          {fehler ? <Fehler>{fehler}</Fehler> : null}
          <Button type="submit" disabled={status === "sendet"}>
            {status === "sendet" ? "Wird gespeichert …" : "Passwort speichern"}
          </Button>
        </form>
      )}
    </AuthSeite>
  );
}
