import { MobileShell } from "@/components/learner/mobile-shell";
import { StartForm } from "./start-form";

// Erster Start: schon vor dem Laden von CSS und JS nach /willkommen springen. Der Client-Redirect in StartForm bleibt als Rückfall (SIN-345).
const ERSTSTART_WEITERLEITUNG =
  'try{var o=JSON.parse(localStorage.getItem("cal-onboarding")||"null");if(!o||o.consent===null||o.consent===undefined)location.replace("/willkommen")}catch(e){}';

/** Screen 01 Start (Kurs erzeugen). Seit SIN-277 unter /start; `/` ist die Startseite für Bildungsträger. Schlagzeile als Server-Komponente, nur das Formular ist Client (SIN-345). */
export default function StartPage() {
  return (
    <MobileShell>
      <script dangerouslySetInnerHTML={{ __html: ERSTSTART_WEITERLEITUNG }} />
      <section
        className="flex flex-col gap-4 bg-gradient-to-br from-[var(--color-bg-hero)] to-[var(--color-brand-primary)] px-7 pb-10 pt-14"
        aria-labelledby="brand-title"
      >
        <h1
          id="brand-title"
          className="text-[34px] font-bold leading-10 text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Content-Agent-Lernapp
        </h1>
        <p
          className="text-xl font-medium leading-7 text-[var(--color-text-on-brand)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Aus einem Schlagwort wird dein MAF-Kurs.
        </p>
        <p className="text-[15px] leading-[22px] text-[var(--color-text-on-brand)]">
          Offizielle AO und RLP. Einheiten à 5–10 Minuten. Du gibst nur das Ziel
          vor.
        </p>
      </section>

      <StartForm />
    </MobileShell>
  );
}
