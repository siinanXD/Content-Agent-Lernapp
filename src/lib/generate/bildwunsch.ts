/**
 * SIN-1551: Bildwunsch des Inhalts-Agenten als reine Daten (Art, Motiv, Werte), nie ein fertiges Bild.
 * Bilder entstehen nach DIDAKTIK § 7 von Hand oder aus Daten, nie von einer KI für Zeichen, Skalen oder Bauteile.
 */
export const BILDWUNSCH_ARTEN = ["flow", "schema", "sign", "sketch", "chart"] as const;

export type Bildwunsch = {
  art: (typeof BILDWUNSCH_ARTEN)[number];
  motiv: string;
  werte: Array<{ name: string; wert: string }>;
};

const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/** Gültiger Bildwunsch oder `null`; fremde Felder (z. B. `src`) fallen weg. */
export function bildwunschOderNull(raw: unknown): Bildwunsch | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { art, motiv, werte } = raw as Record<string, unknown>;
  if (!BILDWUNSCH_ARTEN.includes(art as Bildwunsch["art"]) || !isText(motiv) || !Array.isArray(werte)) return null;
  const paare = werte.flatMap((w) => {
    const { name, wert } = (w ?? {}) as Record<string, unknown>;
    return isText(name) && isText(wert) ? [{ name, wert }] : [];
  });
  return paare.length === werte.length ? { art: art as Bildwunsch["art"], motiv, werte: paare } : null;
}

export const BILDWUNSCH_REGELN = `Bildwunsch (nur Daten, nie ein fertiges Bild): bildwunsch = null oder {"art","motiv","werte"}. art: flow|schema|sign|sketch|chart. motiv: ein Satz, was das Bild zeigen soll. werte: Liste {"name","wert"} der Angaben, die das Bild braucht (Maße, Schritte, Bezeichnungen). Gib kein src, kein SVG und keine URL aus. Wünsche nur ein Bild, wenn es das Verstehen beschleunigt (DIDAKTIK § 7); sonst null.`;
