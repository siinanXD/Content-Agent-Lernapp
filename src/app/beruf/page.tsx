"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { trackOnboardingCompleted, trackOnboardingStep } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { MobileShell } from "@/components/learner/mobile-shell";
import { filterBerufe, findBeruf, saveOnboarding } from "@/lib/learner/onboarding";
import { saveSession } from "@/lib/learner/session";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/**
 * N1 Beruf wählen (Variante 2026): neuer Schritt vor dem Schwerpunkt. Das Suchfeld filtert nur die
 * vorhandenen Berufe. Monoberufe (Industriekaufmann/-frau) gehen direkt zum Lernpfad.
 */
export default function BerufPage() {
  const router = useRouter();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [berufId, setBerufId] = useState<string | null>(null);
  const beruf = findBeruf(berufId);
  const treffer = filterBerufe(query);

  useEffect(() => {
    trackOnboardingStep({ step: "beruf" });
  }, []);

  function next() {
    if (!beruf) return;
    if (beruf.nextRoute === "/schwerpunkt") {
      saveOnboarding({ berufId: beruf.id, schwerpunktId: null, mapId: null });
      router.push("/schwerpunkt");
      return;
    }
    saveOnboarding({ berufId: beruf.id, schwerpunktId: null, mapId: beruf.mapId ?? null });
    saveSession({ keyword: beruf.keyword, variant: "pruefung", totalPoints: 0 });
    trackOnboardingCompleted({ schwerpunktId: beruf.id });
    router.push("/lernpfad");
  }

  return (
    <MobileShell wide>
      <main className="flex flex-1 flex-col gap-3 px-5 pb-8 pt-10 md:gap-4 md:px-12 md:pt-14">
        <header className="flex flex-col gap-1">
          <p className="bento-label">Schritt 3 von 4</p>
          <h1
            className="text-[28px] font-bold leading-9 text-[var(--color-text-primary)] md:text-[40px] md:leading-[44px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dein Beruf
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Wähle deinen Ausbildungsberuf. Der Lernplan folgt der Ausbildungsordnung.
          </p>
        </header>

        <div>
          <label htmlFor={searchId} className="sr-only">
            Beruf suchen
          </label>
          <input
            id={searchId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Beruf suchen, z. B. Industriekauf …"
            className={`min-h-11 w-full rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3.5 py-3 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] ${focus}`}
          />
        </div>

        <div role="group" aria-label="Beruf" className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
          {treffer.map((b) => {
            const selected = b.id === berufId;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setBerufId(b.id)}
                className={`flex flex-col gap-1.5 rounded-[var(--radius-xl)] border p-6 text-left ${focus} ${
                  selected
                    ? "border-[var(--color-bg-hero)] bg-[var(--color-bg-hero)] text-[var(--color-text-on-brand)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                }`}
              >
                <span
                  className={`mono-label ${
                    selected ? "text-[var(--color-text-muted-on-dark)]" : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {b.facts}
                </span>
                <span
                  className="text-xl font-bold leading-[26px]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {b.title}
                </span>
                <span
                  className={`text-sm ${
                    selected ? "text-[var(--color-text-soft-on-dark)]" : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {b.next}
                </span>
              </button>
            );
          })}
        </div>
        <p role="status" className="text-sm text-[var(--color-text-secondary)]">
          {treffer.length === 0 ? "Zu dieser Suche gibt es noch keinen Beruf." : ""}
        </p>

        <p className="rounded-[var(--radius-xl)] bg-[var(--color-bg-hint)] p-5 text-[13px] font-medium leading-[17px] text-[var(--color-text-hint)]">
          Weitere Berufe kommen dazu, sobald es eine amtliche Quelle und geprüfte Inhalte gibt.
        </p>

        <Button className="mt-auto md:w-auto md:self-start" disabled={!beruf} onClick={next}>
          Weiter
        </Button>
      </main>
    </MobileShell>
  );
}
