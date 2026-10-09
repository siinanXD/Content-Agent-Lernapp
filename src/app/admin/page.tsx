"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { TextField } from "@/components/ui/text-field";
import {
  aktionsText,
  checkOrganisationInput,
  summe,
  vonText,
  type Anfrage,
  type KursZeile,
  type OrganisationZeile,
} from "@/lib/admin/organisationen";
import { ausbilderFetch } from "@/lib/ausbilder/client";
import { formatDate } from "@/lib/ausbilder/overview";

type Reiter = "organisationen" | "anfragen" | "kurse";
type Load<T> = { kind: "laden" } | { kind: "anmelden" } | { kind: "fehler"; text: string } | { kind: "bereit"; data: T };

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";
const GENERIC = "Bitte versuchen Sie es noch einmal.";

/** Lädt eine Admin-Liste; 401 und 403 zeigen „Bitte anmelden“, ohne zu verraten, ob die Rolle fehlt. */
function useAdminListe<T>(pfad: string, feld: string, aktiv: boolean) {
  const [load, setLoad] = useState<Load<T[]>>({ kind: "laden" });
  const reload = useCallback(async () => {
    try {
      const res = await ausbilderFetch(pfad);
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (res.status === 401 || res.status === 403) return setLoad({ kind: "anmelden" });
      const liste = body?.[feld];
      if (res.ok && Array.isArray(liste)) return setLoad({ kind: "bereit", data: liste as T[] });
      setLoad({ kind: "fehler", text: typeof body?.error === "string" ? body.error : GENERIC });
    } catch {
      setLoad({ kind: "fehler", text: GENERIC });
    }
  }, [pfad, feld]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden beim Öffnen des Reiters
    if (aktiv) void reload();
  }, [aktiv, reload]);
  return { load, reload };
}

function Zustand<T>({ load, reload, children }: { load: Load<T>; reload: () => void; children: (d: T) => React.ReactNode }) {
  if (load.kind === "laden") return <StateView kind="laden" />;
  if (load.kind === "anmelden") {
    return (
      <StateView kind="leer" title="Bitte anmelden" text="Dieser Bereich ist nur für den Admin.">
        <Link
          href="/anmelden"
          className={`inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] px-5 py-3.5 text-base font-semibold text-[var(--color-text-on-brand)] ${focusRing}`}
        >
          Anmelden
        </Link>
      </StateView>
    );
  }
  if (load.kind === "fehler") {
    return (
      <StateView kind="fehler" text={load.text}>
        <Button variant="secondary" onClick={reload}>
          Erneut versuchen
        </Button>
      </StateView>
    );
  }
  return <>{children(load.data)}</>;
}

function Kennzahl({ wert, label, haupt }: { wert: string; label: string; haupt?: boolean }) {
  return (
    <div className={`${haupt ? "bento-tile bento-main" : "bento-tile"} bento-span-2 md:col-span-1`}>
      <p className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-mono)" }}>
        {wert}
      </p>
      <p className="text-sm">{label}</p>
    </div>
  );
}

const th = "px-3 py-2 text-left bento-label font-medium";
const td = "px-3 py-3 text-sm align-middle";

function Organisationen({ anfragenAnzahl }: { anfragenAnzahl: number | null }) {
  const { load, reload } = useAdminListe<OrganisationZeile>("/api/admin/organisationen", "organisationen", true);
  const [link, setLink] = useState<{ fuer: string; url: string } | null>(null);
  const [fehler, setFehler] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function linkErzeugen(org: OrganisationZeile) {
    if (busy) return;
    setBusy(true);
    setFehler("");
    const res = await ausbilderFetch("/api/admin/organisationen", {
      method: "POST",
      body: JSON.stringify({ organisationId: org.id }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { link?: string; error?: string } | null;
    setBusy(false);
    if (res?.ok && body?.link) {
      setLink({ fuer: org.name, url: body.link });
      setStatus(`Neuer Einladungslink für ${org.name} ist erzeugt.`);
    } else setFehler(body?.error ?? GENERIC);
  }

  async function anlegen(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const input = checkOrganisationInput({
      name: f.get("name"),
      contactEmail: f.get("email"),
      trainerQuota: f.get("trainer"),
      memberQuota: f.get("member"),
    });
    if (!input.ok) return setFehler(input.error);
    setFehler("");
    setBusy(true);
    const res = await ausbilderFetch("/api/admin/organisationen", {
      method: "POST",
      body: JSON.stringify(input.value),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { link?: string; error?: string } | null;
    setBusy(false);
    if (res?.ok && body?.link) {
      setLink({ fuer: input.value.name, url: body.link });
      setStatus(`${input.value.name} ist angelegt. Der Einladungslink steht unten.`);
      form.reset();
      await reload();
    } else setFehler(body?.error ?? GENERIC);
  }

  return (
    <Zustand load={load} reload={() => void reload()}>
      {(zeilen) => {
        const s = summe(zeilen);
        return (
          <div className="flex flex-col gap-[var(--bento-gap)] md:gap-[var(--bento-gap-wide)]">
            <div className="grid grid-cols-2 gap-[var(--bento-gap)] md:grid-cols-4 md:gap-[var(--bento-gap-wide)]">
              <Kennzahl haupt wert={String(zeilen.length)} label="Organisationen" />
              <Kennzahl wert={vonText(s.trainersUsed, s.trainerQuota)} label="Ausbilder-Zugänge vergeben" />
              <Kennzahl wert={vonText(s.membersUsed, s.memberQuota)} label="Azubi-Zugänge vergeben" />
              <Kennzahl wert={anfragenAnzahl === null ? "–" : String(anfragenAnzahl)} label="offene Anfragen" />
            </div>

            <section aria-label="Organisationen" className="bento-tile overflow-x-auto">
              {zeilen.length === 0 ? (
                <p className="text-sm">Noch keine Organisation. Legen Sie unten die erste an.</p>
              ) : (
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr>
                      <th scope="col" className={th}>Organisation</th>
                      <th scope="col" className={th}>Ausbilder</th>
                      <th scope="col" className={th}>Azubi-Zugänge</th>
                      <th scope="col" className={th}>Status</th>
                      <th scope="col" className={th}>
                        <span className="sr-only">Aktion</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {zeilen.map((o) => (
                      <tr key={o.id} className="border-t border-[var(--color-border-subtle)]">
                        <th scope="row" className={`${td} text-left font-semibold`}>{o.name}</th>
                        <td className={td} style={{ fontFamily: "var(--font-mono)" }}>{vonText(o.trainersUsed, o.trainerQuota)}</td>
                        <td className={td} style={{ fontFamily: "var(--font-mono)" }}>{vonText(o.membersUsed, o.memberQuota)}</td>
                        <td className={td}>{o.status}</td>
                        <td className={td}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void linkErzeugen(o)}
                            className={`inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-brand-primary)] disabled:opacity-50 ${focusRing}`}
                          >
                            {aktionsText(o.status)}
                            <span className="sr-only">: {o.name}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <p role="status" className="min-h-5 text-sm text-[var(--color-text-secondary)]">
              {status}
            </p>

            {link ? (
              <section aria-label="Einladungslink" className="bento-tile">
                <p className="bento-label">EINLADUNGSLINK · {link.fuer}</p>
                <p className="break-all text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {link.url}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Geben Sie den Link an die Ansprechperson weiter. Er lässt sich einmal einlösen.
                </p>
                <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(link.url).then(() => setStatus("Link kopiert."))}>
                  Link kopieren
                </Button>
              </section>
            ) : null}

            <form onSubmit={(e) => void anlegen(e)} noValidate className="bento-tile md:max-w-[560px]">
              <h2 className="text-lg font-semibold">Neue Organisation</h2>
              <TextField id="org-name" name="name" label="Organisation" placeholder="Name des Bildungsträgers" maxLength={200} />
              <TextField id="org-email" name="email" type="email" label="E-Mail der Ansprechperson" placeholder="kontakt@beispiel.de" autoComplete="off" />
              <div className="grid grid-cols-2 gap-3">
                <TextField id="org-trainer" name="trainer" type="number" inputMode="numeric" min={1} max={50} defaultValue="1" label="Ausbilder" />
                <TextField id="org-member" name="member" type="number" inputMode="numeric" min={0} max={500} defaultValue="20" label="Azubi-Zugänge" />
              </div>
              <p role="alert" className="min-h-5 text-sm text-[var(--color-feedback-danger)]">
                {fehler}
              </p>
              <Button type="submit" disabled={busy} className="font-semibold">
                Zugang anlegen und Link erzeugen
              </Button>
            </form>
          </div>
        );
      }}
    </Zustand>
  );
}

function Anfragen({ sichtbar, onAnzahl }: { sichtbar: boolean; onAnzahl: (n: number) => void }) {
  // Immer laden: Reiter und Kachel zeigen die Anzahl auch auf den anderen Reitern.
  const { load, reload } = useAdminListe<Anfrage>("/api/admin/anfragen", "anfragen", true);
  useEffect(() => {
    if (load.kind === "bereit") onAnzahl(load.data.length);
  }, [load, onAnzahl]);
  if (!sichtbar) return null;
  return (
    <Zustand load={load} reload={() => void reload()}>
      {(zeilen) =>
        zeilen.length === 0 ? (
          <StateView kind="leer" title="Keine Anfragen" text="Sobald jemand einen Demo-Zugang anfragt, steht er hier." />
        ) : (
          <ul className="flex flex-col gap-[var(--bento-gap)]">
            {zeilen.map((a) => (
              <li key={a.id} className="bento-tile">
                <p className="bento-label">{formatDate(a.createdAt.slice(0, 10))}</p>
                <p className="font-semibold">{a.organisation}</p>
                <p className="text-sm">
                  {a.contactName} · <a href={`mailto:${a.email}`} className={`underline ${focusRing}`}>{a.email}</a>
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {a.participants} Teilnehmende · {a.schwerpunkt}
                </p>
              </li>
            ))}
          </ul>
        )
      }
    </Zustand>
  );
}

function Kurse() {
  const { load, reload } = useAdminListe<KursZeile>("/api/admin/kurse", "kurse", true);
  return (
    <Zustand load={load} reload={() => void reload()}>
      {(zeilen) =>
        zeilen.length === 0 ? (
          <StateView kind="leer" title="Noch keine Kurse" text="Sobald ein Kurs angelegt ist, steht er hier." />
        ) : (
          <section aria-label="Alle Kurse" className="bento-tile overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr>
                  <th scope="col" className={th}>Kurs</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}>Angelegt</th>
                </tr>
              </thead>
              <tbody>
                {zeilen.map((k) => (
                  <tr key={k.id} className="border-t border-[var(--color-border-subtle)]">
                    <th scope="row" className={`${td} text-left font-semibold`}>
                      {k.keyword}
                      {k.mock ? " (Beispiel)" : ""}
                    </th>
                    <td className={td} style={{ fontFamily: "var(--font-mono)" }}>{k.status}</td>
                    <td className={td}>{formatDate(k.createdAt.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      }
    </Zustand>
  );
}

/** X1 Admin · Organisationen und Zugänge (SIN-416): nur für das Konto mit Rolle `admin`. */
export default function AdminPage() {
  const [reiter, setReiter] = useState<Reiter>("organisationen");
  const [anfragenAnzahl, setAnfragenAnzahl] = useState<number | null>(null);
  const reiterListe: Array<[Reiter, string]> = [
    ["organisationen", "Organisationen"],
    ["anfragen", anfragenAnzahl === null ? "Anfragen" : `Anfragen (${anfragenAnzahl})`],
    ["kurse", "Alle Kurse"],
  ];

  return (
    <MobileShell wide>
      <main className="flex flex-col gap-[var(--bento-gap)] px-4 pb-8 pt-10 md:gap-[var(--bento-gap-wide)] md:px-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="bento-label">ADMIN · NUR DEIN KONTO</p>
            <h1 className="text-[28px] font-bold leading-9" style={{ fontFamily: "var(--font-display)" }}>
              Organisationen und Zugänge
            </h1>
          </div>
          <nav aria-label="Admin-Bereiche" className="flex flex-wrap gap-2">
            {reiterListe.map(([id, text]) => (
              <button
                key={id}
                type="button"
                aria-pressed={reiter === id}
                onClick={() => setReiter(id)}
                className={`inline-flex min-h-11 items-center rounded-full border border-[var(--color-border-subtle)] px-3.5 text-[13px] font-medium ${focusRing} ${
                  reiter === id
                    ? "bg-[var(--color-bg-hero)] text-[var(--color-text-on-brand)]"
                    : "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                }`}
              >
                {text}
              </button>
            ))}
          </nav>
        </header>

        {reiter === "organisationen" ? <Organisationen anfragenAnzahl={anfragenAnzahl} /> : null}
        <Anfragen sichtbar={reiter === "anfragen"} onAnzahl={setAnfragenAnzahl} />
        {reiter === "kurse" ? <Kurse /> : null}

        <p className="text-sm text-[var(--color-text-secondary)]">
          Nur dein Konto hat die Rolle Admin. Der Server prüft die Rolle bei jeder Anfrage. Ausbilder sehen nur ihre
          eigenen Gruppen.
        </p>
      </main>
    </MobileShell>
  );
}
