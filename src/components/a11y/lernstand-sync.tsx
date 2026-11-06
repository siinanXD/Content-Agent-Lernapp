"use client";

import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/auth/browser-client";
import { syncLernstand } from "@/lib/learner/konto-sync";
import { LERNSTAND_GEAENDERT } from "@/lib/learner/streak";

/** Ansichten, die den lokalen Stand nur beim Laden lesen: nach einem Abgleich neu laden (nicht mitten in einer Einheit). */
const NEU_LADEN_AUF = new Set(["/lernpfad", "/profil"]);

/** SIN-1451: gleicht den Lernstand beim Start, bei Anmeldung, nach Netzrückkehr und nach lokalen Änderungen mit dem Konto ab. */
export function LernstandSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      if (await syncLernstand()) {
        if (NEU_LADEN_AUF.has(window.location.pathname)) window.location.reload();
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
