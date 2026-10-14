import { PRUEFHINWEIS_MUSTER } from "@/lib/review/pruefhinweise";
import { gateUnit } from "./question-schema";
import type { GeneratedUnit } from "./maf-lernfeld-seed";

/**
 * SIN-628: Staging für Inhalte. Die Fabrik schreibt nur Entwürfe, die App zeigt nur veröffentlichte
 * Einheiten. Einheiten ohne Status (Bestand) gelten als veröffentlicht, nichts verschwindet.
 */
export const istVeroeffentlicht = (u: Pick<GeneratedUnit, "status">): boolean =>
  u.status === undefined || u.status === "veroeffentlicht";

export const nurVeroeffentlicht = (units: GeneratedUnit[]): GeneratedUnit[] =>
  units.every(istVeroeffentlicht) ? units : units.filter(istVeroeffentlicht);

/**
 * Abnahme-Proben (Annahme, siehe docs/decisions/SIN-628-staging.md): alle Fragen bestehen das
 * Schema, mindestens `minFragen` Fragen, kein interner Prüfhinweis im Text.
 */
export function probenGruen(unit: GeneratedUnit, minFragen: number): boolean {
  const { invalid } = gateUnit(unit);
  return (
    invalid.length === 0 &&
    unit.questions.length >= minFragen &&
    !PRUEFHINWEIS_MUSTER.test(JSON.stringify(unit))
  );
}

/** Freigabe: nur Richter bestanden UND Proben grün → veröffentlicht; Richter ok, Proben rot → geprüft; sonst Entwurf. */
export function freigabe(unit: GeneratedUnit, richterBestanden: boolean, proben: boolean): GeneratedUnit {
  const status = richterBestanden ? (proben ? "veroeffentlicht" : "geprueft") : "entwurf";
  return { ...unit, status };
}
