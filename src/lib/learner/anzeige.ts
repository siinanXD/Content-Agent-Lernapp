import { entfernePruefhinweise } from "@/lib/review/pruefhinweise";

/**
 * SIN-1515 — Anzeigefilter: Lernende sehen keine internen Prüfhinweise („vor Publikation fachlich prüfen“),
 * keine Platzhalter („Modul“, „Block“) und keine Kennungen („LF1-1-u12“, „lueckentext“).
 * Die Daten bleiben unverändert; der Filter wirkt beim Aufbau der Einheit (phase-a-path.ts).
 */
export function anzeigeText(text: string): string {
  return entfernePruefhinweise(text);
}

const PLATZHALTER = /^(?:modul|block)$/i;
const FRAGETYP = /^(?:lueckentext|zuordnen|reihenfolge|rechnen|single|multi|standard)$/i;
// Kennung statt Titel: Buchstaben+Ziffern mit Bindestrich/Unterstrich, ohne Leerzeichen, z. B. LF1-1-u12, M0-3.
const KENNUNG = /^(?=.*\d)[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)+$/;

/** „Modul · Block“ nur mit echten Titeln; Platzhalter, Typnamen und Kennungen entfallen. */
export function anzeigeKopfzeile(teile: string[]): string {
  return teile
    .map((t) => t.trim())
    .filter((t) => t && !PLATZHALTER.test(t) && !FRAGETYP.test(t) && !KENNUNG.test(t))
    .join(" · ");
}
