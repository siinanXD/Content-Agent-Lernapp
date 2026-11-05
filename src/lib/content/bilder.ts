/**
 * SIN-1543: Bilder je Einheit oder Frage aus `docs/content/bilder.json` (Schlüssel = ID, Wert = UnitImage nach
 * DIDAKTIK § 8 plus `freigegeben`). Normsymbole (kind "sign" oder `normsymbol: true`: Sicherheitszeichen, GHS,
 * Schaltzeichen) zeigt die App nur mit `freigegeben: true`. Keine Spalte, keine Bilderzeugung.
 */
import datei from "../../../docs/content/bilder.json";
import { altTextOk, type UnitImage } from "@/lib/content/didaktik";

export type BildEintrag = UnitImage & { freigegeben?: boolean; normsymbol?: boolean };

export const BILDER = datei as Record<string, BildEintrag>;

export const istNormsymbol = (b: BildEintrag): boolean => b.kind === "sign" || b.normsymbol === true;

/** Fehler je Eintrag: ohne Alt-Text, Quelle oder Lizenz fällt er durch. */
export function pruefeBilder(bilder: Record<string, BildEintrag>): string[] {
  return Object.entries(bilder).flatMap(([id, b]) => {
    const fehler: string[] = [];
    if (!b.src?.trim()) fehler.push("Pfad fehlt");
    if (!altTextOk(b.alt ?? "")) fehler.push("Alt-Text fehlt oder länger als 125 Zeichen");
    if (!b.source?.url?.trim()) fehler.push("Quelle fehlt");
    if (!b.source?.license?.trim()) fehler.push("Lizenz fehlt");
    return fehler.map((f) => `${id}: ${f}`);
  });
}

/** Bild zur ID, nur wenn es gültig und (bei Normsymbolen) freigegeben ist. */
export function bildFuer(id: string, bilder: Record<string, BildEintrag> = BILDER): UnitImage | undefined {
  const b = bilder[id];
  if (!b || pruefeBilder({ [id]: b }).length) return undefined;
  if (istNormsymbol(b) && b.freigegeben !== true) return undefined;
  const { freigegeben: _f, normsymbol: _n, ...bild } = b;
  return bild;
}
