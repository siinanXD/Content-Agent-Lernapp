/**
 * Beispieldaten für die Gruppenansicht ohne Konto (SIN-385). Alles erfunden: keine echten Personen,
 * Namen sind Platzhalter-Kennungen. Zeiten hängen von `now` ab, damit „Inaktiv“ und „Unter Plan“ sichtbar sind.
 */
import type { Overview } from "./overview";

export const DEMO_PARAM = "demo";
export const DEMO_HREF = `/ausbilder?${DEMO_PARAM}=1`;

const DAY_MS = 86_400_000;

function isoDay(now: Date, offsetDays: number): string {
  const d = new Date(now.getTime() + offsetDays * DAY_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDemoSearch(search: string): boolean {
  return new URLSearchParams(search).get(DEMO_PARAM) === "1";
}

export function demoOverview(now: Date): Overview {
  const ago = (days: number) => new Date(now.getTime() - days * DAY_MS).toISOString();
  return {
    group: {
      name: "Beispielgruppe",
      schwerpunkt: "Metall- und Kunststofftechnik",
      examDate: isoDay(now, 120),
      startsOn: isoDay(now, -60),
    },
    members: [
      { id: "demo-1", name: "Beispiel A.", progressPercent: 68, lastActiveAt: ago(0) },
      { id: "demo-2", name: "Beispiel B.", progressPercent: 55, lastActiveAt: ago(2) },
      { id: "demo-3", name: "Beispiel C.", progressPercent: 31, lastActiveAt: ago(9) },
      { id: "demo-4", name: "Beispiel D.", progressPercent: 24, lastActiveAt: ago(12) },
      { id: "demo-5", name: "Beispiel E.", progressPercent: 47, lastActiveAt: ago(1) },
    ],
  };
}
