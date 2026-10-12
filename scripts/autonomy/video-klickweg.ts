/** Klickweg des Tutorial-Videos (SIN-483): Kennung, Titel und Einblendung je Schritt. Texte deutsch, kurz, ohne erfundene Zahlen. */
export type Schritt = { id: string; titel: string; text: string; startMs?: number };

export const KLICKWEG: Schritt[] = [
  { id: "start", titel: "Start", text: "Los geht’s: die Lern-App öffnen" },
  { id: "beruf", titel: "Beruf wählen", text: "Beruf und Schwerpunkt auswählen" },
  { id: "lernpfad", titel: "Lernpfad", text: "Der Lernpfad zeigt die Einheit für heute" },
  { id: "einheit", titel: "Erste Einheit", text: "Fragen beantworten und sofort Rückmeldung bekommen" },
  { id: "ergebnis", titel: "Ergebnis", text: "Am Ende steht das Ergebnis der Einheit" },
];
