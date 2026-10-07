"use client";

import Link from "next/link";
import { useState } from "react";
import { useA11y } from "@/components/a11y/a11y-provider";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { Bento, Tile } from "@/components/ui/tile";
import { ToggleRow } from "@/components/ui/toggle-row";
import { useOnline } from "@/lib/use-online";
import {
  clearLocalData,
  exportLocalData,
  loadOnboarding,
  loadReminder,
  saveOnboarding,
  saveReminder,
  type OnboardingState,
  type Reminder,
} from "@/lib/learner/onboarding";
import { forgetAnalyticsUser } from "@/lib/analytics";
import { useAfterMount } from "@/lib/use-after-mount";

const LEGAL = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/ki-hinweis", label: "KI-Hinweis" },
  { href: "/quellen", label: "Quellen" },
];

/** Screen 16 Einstellungen (Figma 21:331) */
export default function EinstellungenPage() {
  const { prefs, setPrefs } = useA11y();
  const storedReminder = useAfterMount(loadReminder, { enabled: false, time: "18:00" });
  const storedOnboarding = useAfterMount<OnboardingState | null>(loadOnboarding, null);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [consent, setConsent] = useState<boolean | null | undefined>(undefined);
  const [consentTime, setConsentTime] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const online = useOnline();

  const shownReminder = reminder ?? storedReminder;
  const shownConsent =
    (consent !== undefined ? consent : storedOnboarding?.consent) ?? false;

  const reminderActive = shownConsent && shownReminder.enabled;
  const consentAt = consentTime ?? storedOnboarding?.consentAt;
  const consentNote = revoked
    ? "Messung gestoppt. Danke trotzdem."
    : shownConsent && consentAt
      ? `Erteilt am ${new Date(consentAt).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}`
      : "";

  function updateReminder(next: Reminder) {
    setReminder(next);
    saveReminder(next);
  }

  /** Widerruf wirkt sofort: `saveOnboarding` löst die Synchronisierung mit PostHog aus. Erinnerungen enden mit. */
  function changeConsent(c: boolean) {
    setConsent(c);
    setRevoked(!c);
    setConsentTime(saveOnboarding({ consent: c }).consentAt);
    if (!c) updateReminder({ ...shownReminder, enabled: false });
  }

  function deleteUsageData() {
    changeConsent(false);
    void forgetAnalyticsUser();
    setMessage("Die Kennung auf diesem Gerät ist verworfen. Dein Lernfortschritt bleibt.");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(exportLocalData(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lernapp-daten.json";
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Daten exportiert.");
  }

  function deleteData() {
    clearLocalData();
    setConfirmDelete(false);
    setReminder(null);
    setConsent(null);
    setMessage("Lokale Daten dieses Geräts gelöscht.");
  }

  return (
    <MobileShell>
      <header className="px-6 pb-4 pt-12">
        <p className="mono-label text-[var(--color-text-secondary)]">Profil</p>
        <h1
          className="text-[28px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Einstellungen
        </h1>
      </header>

      <Bento className="flex-1 px-6 pb-6">
        {online ? null : (
          <StateView
            kind="offline"
            text="Einstellungen bleiben auf diesem Gerät gespeichert. Widerruf und Löschen wirken auch ohne Verbindung."
          />
        )}
        <Section title="Lernen">
          <ToggleRow
            id="simple-language"
            label="Einfache Sprache"
            checked={prefs.simpleLanguage}
            onChange={(c) => setPrefs({ ...prefs, simpleLanguage: c })}
          />
          <ToggleRow
            id="read-aloud"
            label="Vorlesen"
            checked={prefs.readAloud}
            onChange={(c) => setPrefs({ ...prefs, readAloud: c })}
          />
        </Section>

        <Section title="Datennutzung">
          <ToggleRow
            id="consent"
            label="Anonyme Nutzungsdaten"
            description="Hilft, Fragen und Einheiten zu verbessern"
            checked={shownConsent}
            onChange={changeConsent}
          />
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Widerruf jederzeit: Schalter ausschalten, dann stoppt die Messung sofort.
          </p>
          <p role="status" className="text-xs text-[var(--color-text-secondary)]">
            {consentNote}
          </p>
          <h3
            className="pt-1 text-[15px] font-medium text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Was gespeichert wird
          </h3>
          <p className="text-sm leading-5 text-[var(--color-text-secondary)]">
            Antworten (richtig/falsch), Dauer pro Einheit, Abbrüche, mit einer
            Zufalls-Kennung. Kein Name, keine E-Mail in den Nutzungsdaten.
          </p>
          <Button variant="secondary" onClick={deleteUsageData}>
            Meine Nutzungsdaten löschen
          </Button>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Entfernt alle Nutzungsdaten zu dieser Kennung. Dein Lernfortschritt
            bleibt.
          </p>
        </Section>

        <Section title="Erinnerung">
          <ToggleRow
            id="reminder"
            label="Lern-Erinnerung"
            description={
              reminderActive
                ? `Eine Nachricht am Tag um ${shownReminder.time}`
                : shownConsent
                  ? "Aus"
                  : "Aus, nur mit Einwilligung"
            }
            checked={reminderActive}
            disabled={!shownConsent}
            onChange={(c) => updateReminder({ ...shownReminder, enabled: c })}
          />
          {reminderActive ? (
            <label className="flex min-h-11 items-center justify-between gap-3 text-[15px] text-[var(--color-text-primary)]">
              Uhrzeit
              <input
                type="time"
                value={shownReminder.time}
                onChange={(e) =>
                  updateReminder({ ...shownReminder, time: e.target.value })
                }
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              />
            </label>
          ) : null}
        </Section>

        <Section title="Daten auf diesem Gerät">
          <Button variant="secondary" onClick={exportData}>
            Daten exportieren
          </Button>
          {confirmDelete ? (
            <div
              role="alertdialog"
              aria-label="Daten löschen bestätigen"
              className="flex flex-col gap-2"
            >
              <p className="text-sm text-[var(--color-text-primary)]">
                Alle Daten auf diesem Gerät werden gelöscht: Fortschritt,
                Wiederholungsstapel, Einstellungen.
              </p>
              <Button onClick={deleteData}>Endgültig löschen</Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
              Daten löschen
            </Button>
          )}
          <p role="status" className="text-sm text-[var(--color-text-secondary)]">
            {message}
          </p>
        </Section>

        <Section title="Rechtliches">
          <ul className="flex flex-col">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-11 items-center text-[15px] text-[var(--color-brand-primary)] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </Bento>

      <BottomNav />
    </MobileShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Tile className="!gap-2">
      <h2
        className="text-base font-semibold text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {children}
    </Tile>
  );
}
