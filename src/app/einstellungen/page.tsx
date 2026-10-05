"use client";

import Link from "next/link";
import { useState } from "react";
import { useA11y } from "@/components/a11y/a11y-provider";
import { BottomNav } from "@/components/learner/bottom-nav";
import { MobileShell } from "@/components/learner/mobile-shell";
import { Button } from "@/components/ui/button";
import { ToggleRow } from "@/components/ui/toggle-row";
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
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const shownReminder = reminder ?? storedReminder;
  const shownConsent =
    (consent !== undefined ? consent : storedOnboarding?.consent) ?? false;

  function updateReminder(next: Reminder) {
    setReminder(next);
    saveReminder(next);
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
        <h1
          className="text-[28px] font-bold text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Einstellungen
        </h1>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-6 pb-6">
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
          <ToggleRow
            id="reminder"
            label="Erinnerung"
            checked={shownReminder.enabled}
            onChange={(c) => updateReminder({ ...shownReminder, enabled: c })}
          />
          {shownReminder.enabled ? (
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

        <Section title="Daten">
          <ToggleRow
            id="consent"
            label="Nutzungsdaten speichern"
            checked={shownConsent}
            onChange={(c) => {
              setConsent(c);
              saveOnboarding({ consent: c });
            }}
          />
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
      </div>

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
    <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3.5">
      <h2
        className="text-base font-medium text-[var(--color-text-primary)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
