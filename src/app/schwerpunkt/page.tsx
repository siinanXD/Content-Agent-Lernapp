"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MobileShell } from "@/components/learner/mobile-shell";
import { findSchwerpunkt, saveOnboarding, SCHWERPUNKTE } from "@/lib/learner/onboarding";
import { saveSession } from "@/lib/learner/session";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/** Kennung je Schwerpunkt (Mono, wie die Symbole in Figma 56:401), nur Zier: nicht vorgelesen. */
const MARK: Record<string, string> = {
  "metall-kunststoff": "01",
  "druck-papier": "02",
  textiltechnik: "03",
  textilveredelung: "04",
  lebensmitteltechnik: "05",
};

/** W3 Schwerpunkt (Figma 56:401, Variante 2026): fünf amtliche Schwerpunkte als Kacheln, Betrieb optional. */
export default function SchwerpunktPage() {
  const router = useRouter();
  const [schwerpunktId, setSchwerpunktId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const schwerpunkt = findSchwerpunkt(schwerpunktId);
  const twoMaps = (schwerpunkt?.maps.length ?? 0) > 1;

  function pick(id: string) {
    setSchwerpunktId(id);
    setMapId(findSchwerpunkt(id)?.defaultMapId ?? null);
  }

  function next() {
    if (!schwerpunkt) return;
    const chosen = mapId ?? schwerpunkt.defaultMapId;
    saveOnboarding({ schwerpunktId: schwerpunkt.id, mapId: chosen });
    saveSession({
      keyword: "Maschinen- und Anlagenführer",
      variant: "pruefung",
      totalPoints: 0,
    });
    router.push("/lernpfad");
  }

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-11">
        <p className="mono-label uppercase text-[var(--color-text-secondary)]">
          Schritt 3 von 3
        </p>
        <h1
          className="text-[30px] font-bold leading-[1.3] text-[var(--color-text-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dein Schwerpunkt
        </h1>

        <div
          role="group"
          aria-label="Schwerpunkt"
          className="grid grid-cols-2 gap-[var(--bento-gap)]"
        >
          {SCHWERPUNKTE.map((s) => {
            const selected = s.id === schwerpunktId;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                onClick={() => pick(s.id)}
                className={`flex min-h-[130px] flex-col justify-between gap-5 rounded-[20px] border-2 p-4 text-left ${focus} ${
                  selected
                    ? "border-[var(--color-bg-hero)] bg-[var(--color-bg-hero)]"
                    : "border-[var(--color-bg-surface)] bg-[var(--color-bg-surface)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mono-label ${
                    selected
                      ? "text-[var(--color-accent-on-dark)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {MARK[s.id] ?? ""}
                </span>
                <span
                  lang="de"
                  className={`min-w-0 break-words hyphens-auto text-[15px] font-semibold leading-[1.3] ${
                    selected
                      ? "text-[var(--color-text-on-brand)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        <section
          aria-labelledby="betrieb-label"
          className="flex flex-col gap-2 rounded-[20px] bg-[var(--color-bg-surface)] p-4"
        >
          <h2
            id="betrieb-label"
            className="mono-label uppercase text-[var(--color-text-secondary)]"
          >
            Dein Betrieb (optional)
          </h2>
          <p className="text-sm leading-[1.3] text-[var(--color-text-secondary)]">
            Für passende Beispiele, z. B. Kunststoffverarbeitung
          </p>
          {schwerpunkt && twoMaps ? (
            <div
              role="group"
              aria-label="Dein Betrieb"
              className="mt-1 flex flex-wrap gap-2"
            >
              {schwerpunkt.maps.map((m) => {
                const selected = m.mapId === mapId;
                return (
                  <button
                    key={m.mapId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMapId(m.mapId)}
                    className={`min-h-11 rounded-full border-2 px-4 text-sm font-medium text-[var(--color-text-primary)] ${focus} ${
                      selected
                        ? "border-[var(--color-brand-primary)] bg-[var(--color-bg-hint)]"
                        : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"
                    }`}
                  >
                    {m.betrieb}
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="flex-1" />

        <button
          type="button"
          disabled={!schwerpunkt}
          onClick={next}
          className={`flex min-h-[53px] items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-primary)] px-[18px] text-base font-semibold text-[var(--color-text-on-brand)] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lernpfad erstellen
        </button>
      </main>
    </MobileShell>
  );
}
