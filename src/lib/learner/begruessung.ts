/**
 * Begrüßung und Wochentag für den Lernpfad (Figma 52:377). Nur im Browser aufrufen: die Uhrzeit
 * gehört den Lernenden, nicht dem Server beim Bauen der Seite.
 */
export type Begruessung = { weekday: string; greeting: string };

export function begruessung(now: Date): Begruessung {
  const hour = now.getHours();
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const weekday = now.toLocaleDateString("de-DE", { weekday: "long" });
  return { weekday, greeting };
}
