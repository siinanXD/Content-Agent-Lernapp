"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionChoice } from "@/components/ui/option-choice";
import { MobileShell } from "@/components/learner/mobile-shell";
import { findSchwerpunkt, saveOnboarding, SCHWERPUNKTE } from "@/lib/learner/onboarding";
import { saveSession } from "@/lib/learner/session";

/** Screen 15 Schwerpunkt wählen (Figma 20:356): die 5 amtlichen MAF-Schwerpunkte. */
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
      streakDays: 0,
      totalPoints: 0,
    });
    router.push("/lernpfad");
  }

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col gap-5 px-6 pb-8 pt-14">
        <header>
          <h1
            className="text-[28px] font-bold text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Schwerpunkt wählen
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
            Maschinen- und Anlagenführer/in hat fünf amtliche Schwerpunkte.
          </p>
        </header>

        <div role="group" aria-label="Schwerpunkt" className="flex flex-col gap-2.5">
          {SCHWERPUNKTE.map((s) => (
            <OptionChoice
              key={s.id}
              label={s.title}
              state={s.id === schwerpunktId ? "selected" : "default"}
              onSelect={() => pick(s.id)}
            />
          ))}
        </div>

        {schwerpunkt && twoMaps ? (
          <div role="group" aria-label="Referenzberuf" className="flex flex-col gap-2.5">
            <h2
              className="text-base font-medium text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Referenzberuf
            </h2>
            {schwerpunkt.maps.map((m) => (
              <OptionChoice
                key={m.mapId}
                label={m.referenzberuf}
                state={m.mapId === mapId ? "selected" : "default"}
                onSelect={() => setMapId(m.mapId)}
              />
            ))}
          </div>
        ) : null}

        <Button className="mt-auto" disabled={!schwerpunkt} onClick={next}>
          Weiter
        </Button>
      </main>
    </MobileShell>
  );
}
