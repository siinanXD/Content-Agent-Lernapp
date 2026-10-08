"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackOnboardingCompleted, trackOnboardingStep } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { OptionChoice } from "@/components/ui/option-choice";
import { MobileShell } from "@/components/learner/mobile-shell";
import { findSchwerpunkt, saveOnboarding, SCHWERPUNKTE } from "@/lib/learner/onboarding";
import { saveSession } from "@/lib/learner/session";

/** W3 Schwerpunkt wählen (Variante 2026): die 5 amtlichen MAF-Schwerpunkte als Kacheln, Betrieb optional. */
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
    saveOnboarding({ schwerpunktId: schwerpunkt.id, mapId: chosen });
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
      <main className="flex flex-1 flex-col gap-6 px-6 pb-8 pt-14 md:px-12">
        <header>
          <p className="bento-label">Schritt 2 von 2</p>
          <h1
            className="mt-2 text-[40px] font-bold leading-[44px] text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Schwerpunkt wählen
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
            Maschinen- und Anlagenführer/in hat fünf amtliche Schwerpunkte.
          </p>
        </header>

        <div role="group" aria-label="Schwerpunkt" className="bento">
          {SCHWERPUNKTE.map((s) => (
            <div key={s.id} className="bento-span-2">
              <OptionChoice
                label={s.title}
                state={s.id === schwerpunktId ? "selected" : "default"}
                onSelect={() => pick(s.id)}
              />
            </div>
          ))}
        </div>

        {schwerpunkt && twoMaps ? (
          <section className="bento-tile" aria-labelledby="betrieb-titel">
            <p className="bento-label">Optional</p>
            <h2
              id="betrieb-titel"
              className="text-lg font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Dein Betrieb
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Beides ist Maschinen- und Anlagenführer/in. Die Wahl passt nur
              Beispiele und Berufsschul-Themen an deinen Betrieb an. Ohne Wahl
              nehmen wir {defaultBetrieb}.
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

        <Button className="mt-auto md:w-auto md:self-start" disabled={!schwerpunkt} onClick={next}>
          Weiter
        </Button>
      </main>
    </MobileShell>
  );
}
