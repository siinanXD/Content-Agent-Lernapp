"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { TextField } from "@/components/ui/text-field";
import { getAccessToken } from "@/lib/auth/browser-client";
import {
  checkNames,
  formatCode,
  invitationsText,
  parseInvitations,
  type Invitation,
} from "@/lib/ausbilder/gruppe";

type List =
  | { kind: "laden" }
  | { kind: "fehler" }
  | { kind: "bereit"; invitations: Invitation[] };

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Teilnehmende einladen (SIN-356): ein Anzeigename (Vorname + Initial) ergibt einen Beitrittscode.
 * Die App versendet nichts; die Ausbilder geben die Codes selbst weiter.
 */
export function InviteSection({ onInvited }: { onInvited: () => void }) {
  const [list, setList] = useState<List>({ kind: "laden" });
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ausbilder/einladungen", {
        headers: await authHeaders(),
        cache: "no-store",
      });
      const invitations = res.ok ? parseInvitations(await res.json().catch(() => null)) : null;
      setList(invitations ? { kind: "bereit", invitations } : { kind: "fehler" });
    } catch {
      setList({ kind: "fehler" });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Einladungen laden beim Öffnen
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const names = checkNames([name]);
    if (!names.ok) return setError(names.error);
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const res = await fetch("/api/ausbilder/einladungen", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ names: names.value }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (res.ok) {
        setName("");
        setStatus(`Einladung für ${names.value[0]} erzeugt.`);
        await load();
        onInvited();
        document.getElementById("einladung-name")?.focus();
        return;
      }
      setError((data as { error?: string } | null)?.error ?? "Die Einladung konnte nicht erzeugt werden.");
    } catch {
      setError("Die Einladung konnte nicht erzeugt werden. Bitte versuchen Sie es noch einmal.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    if (list.kind !== "bereit") return;
    try {
      await navigator.clipboard.writeText(invitationsText(list.invitations));
      setStatus("Codes kopiert.");
    } catch {
      setStatus("Kopieren ist hier nicht möglich. Markieren Sie die Codes und kopieren Sie sie selbst.");
    }
  }

  return (
    <section aria-labelledby="einladen-titel" className="bento-tile !gap-4">
      <h2
        id="einladen-titel"
        className="text-lg font-medium"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Teilnehmende einladen
      </h2>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 md:max-w-[420px]">
        <TextField
          id="einladung-name"
          label="Vorname und Initial"
          placeholder="Aylin K."
          value={name}
          maxLength={60}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
        <p role="alert" className="min-h-5 text-sm text-[var(--color-feedback-danger)]">
          {error}
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? "Wird erzeugt …" : "Einladung erzeugen"}
        </Button>
      </form>
      <p role="status" className="min-h-5 text-sm text-[var(--color-text-secondary)]">
        {status}
      </p>

      {list.kind === "laden" ? <StateView kind="laden" /> : null}
      {list.kind === "fehler" ? (
        <StateView kind="fehler" text="Die Einladungen konnten nicht geladen werden.">
          <Button variant="secondary" onClick={() => void load()}>
            Erneut versuchen
          </Button>
        </StateView>
      ) : null}
      {list.kind === "bereit" && list.invitations.length === 0 ? (
        <StateView
          kind="leer"
          title="Noch keine Einladungen"
          text="Tragen Sie einen Namen ein. Der Code gehört zu dieser Person."
        />
      ) : null}
      {list.kind === "bereit" && list.invitations.length > 0 ? (
        <>
          <ul aria-label="Einladungen" className="flex flex-col">
            {list.invitations.map((i, n) => (
              <li
                key={i.memberId}
                className={`flex items-baseline justify-between gap-3 py-3 ${n === 0 ? "" : "border-t border-[var(--color-border-subtle)]"}`}
              >
                <span className="truncate text-[15px] font-semibold">{i.name}</span>
                <span className="text-[15px]" style={{ fontFamily: "var(--font-mono)" }}>
                  {formatCode(i.code)}
                </span>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={() => void copyAll()} className="md:max-w-[420px]">
            Alle Codes kopieren
          </Button>
          <p className="text-xs leading-4 text-[var(--color-text-secondary)]">
            Die App versendet keine Einladungen. Geben Sie jedem Teilnehmenden den eigenen Code selbst weiter.
          </p>
        </>
      ) : null}
    </section>
  );
}
