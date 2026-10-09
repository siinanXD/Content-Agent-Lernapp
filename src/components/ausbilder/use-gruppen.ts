"use client";

import { useCallback, useEffect, useState } from "react";
import { ausbilderFetch } from "@/lib/ausbilder/client";
import { parseGruppen, type Gruppen } from "@/lib/ausbilder/gruppen";

export type GruppenLoad =
  | { kind: "laden" }
  | { kind: "anmelden" }
  | { kind: "fehler"; text: string }
  | { kind: "bereit"; data: Gruppen };

/** Lädt Meine Gruppen (SIN-415). `still`: im Hintergrund auffrischen, ohne die Seite auf „Laden“ zu setzen. */
export function useGruppen() {
  const [load, setLoad] = useState<GruppenLoad>({ kind: "laden" });

  const reload = useCallback(async (still = false) => {
    if (!still) setLoad({ kind: "laden" });
    try {
      const res = await ausbilderFetch("/api/ausbilder/gruppen");
      // Antwort immer ganz lesen, auch bei 401: sonst bleibt die Anfrage offen.
      const body: unknown = await res.json().catch(() => null);
      if (res.status === 401 || res.status === 403) return setLoad({ kind: "anmelden" });
      const data = res.ok ? parseGruppen(body) : null;
      if (data) return setLoad({ kind: "bereit", data });
      const text = (body as { error?: string } | null)?.error;
      setLoad({ kind: "fehler", text: text ?? "Bitte versuchen Sie es noch einmal." });
    } catch {
      setLoad({ kind: "fehler", text: "Bitte versuchen Sie es noch einmal." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden beim Öffnen der Seite
    void reload();
  }, [reload]);

  return { load, reload };
}

/** Archivieren oder wiederherstellen; liefert eine Fehlermeldung oder `null`. */
export async function gruppeAktion(id: string, aktion: "archivieren" | "wiederherstellen"): Promise<string | null> {
  try {
    const res = await ausbilderFetch("/api/ausbilder/gruppen", {
      method: "POST",
      body: JSON.stringify({ id, aktion }),
    });
    if (res.ok) return null;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.";
  } catch {
    return "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.";
  }
}
