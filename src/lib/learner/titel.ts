/** Titel für Lernende ohne interne Kennungen und Adressen (SIN-1455). Inhalte in der Datenbank bleiben unverändert. */
const KENNUNG = /\b[A-Z]{1,3}\d*-\d+(?:-[uq]\d+)+\b/g;
const ADRESSE = /\bhttps?:\/\/\S+/g;

export function sauberTitel(titel: string): string {
  return titel
    .replace(ADRESSE, "")
    .replace(KENNUNG, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:·–-]+|[\s:·–-]+$/g, "");
}

/** Titel, die in einer Liste mehrfach vorkommen (ohne Groß-/Kleinschreibung), mit Anzahl. Nur melden, nichts ändern. */
export function doppelteTitel(titel: string[]): Array<{ titel: string; anzahl: number }> {
  const zaehler = new Map<string, { titel: string; anzahl: number }>();
  for (const t of titel) {
    const sauber = sauberTitel(t);
    const key = sauber.toLowerCase();
    const alt = zaehler.get(key);
    if (alt) alt.anzahl += 1;
    else zaehler.set(key, { titel: sauber, anzahl: 1 });
  }
  return [...zaehler.values()].filter((e) => e.anzahl > 1);
}
