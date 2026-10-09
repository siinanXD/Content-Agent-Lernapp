"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackOnboardingCompleted, trackOnboardingStep } from "@/lib/analytics";
import { OptionChoice } from "@/components/ui/option-choice";
import { MobileShell } from "@/components/learner/mobile-shell";
import { findSchwerpunkt, saveOnboarding, SCHWERPUNKTE } from "@/lib/learner/onboarding";
import { saveSession } from "@/lib/learner/session";

/** Kurzname und Zeichen je Schwerpunkt (Figma 56:401). Die amtlichen Namen stehen in `SCHWERPUNKTE`. */
const KACHEL: Record<string, { glyph: string; kurz: string }> = {
  "metall-kunststoff": { glyph: "⚙", kurz: "Metall + Kunststoff" },
  "druck-papier": { glyph: "▤", kurz: "Druck + Papier" },
  textiltechnik: { glyph: "≋", kurz: "Textiltechnik" },
  textilveredelung: { glyph: "◌", kurz: "Textilveredelung" },
  lebensmitteltechnik: { glyph: "◍", kurz: "Lebensmittel" },
};

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]";

/**
 * W3 Schwerpunkt (Figma 56:401, Variante 2026): die 5 amtlichen MAF-Schwerpunkte als Kacheln,
 * Betrieb optional (nur bei zwei Betriebsarten). Die Auswahl bleibt in der App, Figma zeigt sie nicht.
 */
export default function SchwerpunktPage() {
  const router = useRouter();
  const [schwerpunktId, setSchwerpunktId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const schwerpunkt = findSchwerpunkt(schwerpunktId);
  const twoMaps = (schwerpunkt?.maps.length ?? 0) > 1;
  const defaultBetrieb = schwerpunkt?.maps.find((m) => m.mapId === schwerpunkt.defaultMapId)?.betrieb;

  useEffect(() => {
    trackOnboardingStep({ step: "schwerpunkt" });
  }, []);

  function pick(id: string) {
    setSchwerpunktId(id);
    setMapId(findSchwerpunkt(id)?.defaultMapId ?? null);
  }

  function next() {
    if (!schwerpunkt) return;
    const chosen = mapId ?? schwerpunkt.defaultMapId;
    saveOnboarding({ berufId: "maf", schwerpunktId: schwerpunkt.id, mapId: chosen });
    saveSession({
      keyword: "Maschinen- und Anlagenführer",
      variant: "pruefung",
      totalPoints: 0,
    });
    trackOnboardingCompleted({ schwerpunktId: schwerpunkt.id });
    router.push("/lernpfad");
  }

  return (
    <MobileShell wide>
      <main className="flex flex-1 flex-col gap-3.5 bg-[var(--color-bg-canvas)] px-4 pb-6 pt-11 md:px-12">
        <header className="flex flex-col gap-3">
          <p className="bento-label uppercase">Schritt 4 von 4</p>
          <h1
            className="text-[30px] font-bold leading-[39px] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dein Schwerpunkt
          </h1>
        </header>

        <div role="group" aria-label="Schwerpunkt" className="grid grid-cols-2 gap-2.5">
          {SCHWERPUNKTE.map((s) => {
            const selected = s.id === schwerpunktId;
            const kachel = KACHEL[s.id];
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                onClick={() => pick(s.id)}
                className={`flex min-h-[130px] flex-col justify-between gap-5 rounded-[var(--radius-xl)] p-4 text-left ${focus} ${
                  selected
                    ? "bg-[var(--color-bg-hero)] text-[var(--color-text-on-brand)]"
                    : "border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`text-[26px] font-bold leading-[34px] ${
                    selected ? "text-[var(--color-brand-accent)]" : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {kachel?.glyph}
                </span>
                <span className="text-[15px] font-semibold leading-[19.5px]" style={{ fontFamily: "var(--font-display)" }}>
                  {kachel?.kurz ?? s.title}
                </span>
              </button>
            );
          })}
        </div>

        {schwerpunkt && twoMaps ? (
          <section
            aria-labelledby="betrieb-titel"
            className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4"
          >
            <h2 id="betrieb-titel" className="mono-label uppercase text-[var(--color-text-secondary)]">
              Dein Betrieb (optional)
            </h2>
            <p className="text-sm leading-[18px] text-[var(--color-text-secondary)]">
              Beides ist Maschinen- und Anlagenführer/in. Die Wahl passt nur Beispiele und
              Berufsschul-Themen an deinen Betrieb an. Ohne Wahl nehmen wir {defaultBetrieb}.
            </p>
            <div role="group" aria-label="Dein Betrieb" className="flex flex-col gap-2.5 md:flex-row">
              {schwerpunkt.maps.map((m) => (
                <div key={m.mapId} className="md:flex-1">
                  <OptionChoice
                    label={m.betrieb}
                    state={m.mapId === mapId ? "selected" : "default"}
                    onSelect={() => setMapId(m.mapId)}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <button
          type="button"
          disabled={!schwerpunkt}
          onClick={next}
          className={`mt-auto flex min-h-[53px] w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-primary)] px-[18px] py-4 text-base font-semibold text-[var(--color-text-on-brand)] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lernpfad erstellen
        </button>
      </main>
    </MobileShell>
  );
}
