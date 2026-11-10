"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/auth/browser-client";
import { syncLernstand } from "@/lib/learner/konto-sync";
import { LERNSTAND_GEAENDERT } from "@/lib/learner/streak";

/** Ansichten, die den lokalen Stand nur beim Laden lesen: nach einem Abgleich neu laden (nicht mitten in einer Einheit). Heute, Pfad und Kurs-Ansichten liegen alle unter /lernpfad (SIN-1455). */
const neuLadenAuf = (pfad: string) => pfad === "/profil" || pfad === "/lernpfad" || pfad.startsWith("/lernpfad/");

/** SIN-1451: gleicht den Lernstand beim Start, bei Anmeldung, nach Netzrückkehr und nach lokalen Änderungen mit dem Konto ab. */
export function LernstandSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      if (await syncLernstand()) {
        if (neuLadenAuf(window.location.pathname)) window.location.reload();
      }
    };
    const spaeter = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), 1000);
    };
    void run();
    window.addEventListener("online", run);
    window.addEventListener(LERNSTAND_GEAENDERT, spaeter);
    let abmelden: (() => void) | undefined;
    void getBrowserSupabase().then((client) => {
      const sub = client?.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") void run();
      });
      abmelden = () => sub?.data.subscription.unsubscribe();
    });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", run);
      window.removeEventListener(LERNSTAND_GEAENDERT, spaeter);
      abmelden?.();
    };
  }, []);
  return null;
}
