/**
 * MAF Metall/Kunststoff topic bank derived from MaschFüAusbV Berufsbild (§4)
 * and KMK RLP pointers (related Industriemechaniker Lernfelder for years 1–2).
 * No IHK exam task text — titles only for planning.
 */
export type PlanUnit = {
  id: string;
  title: string;
  minutes: number;
  sourceKind: "ausbildungsordnung" | "rahmenlehrplan" | "pruefung";
};

export type PlanDay = {
  day: number;
  targetMinutes: number;
  units: PlanUnit[];
};

export type PlanVariant = {
  name: string;
  durationDays: number;
  hoursPerDay: number;
  days: PlanDay[];
};

/** Ordered topic titles (AO Grundbildung + Fachbildung Metall focus + Prüfungsthemen). */
export const MAF_METALL_TOPICS: Array<{
  title: string;
  sourceKind: PlanUnit["sourceKind"];
}> = [
  { title: "Berufsbildung und Ausbildungsrahmenplan lesen", sourceKind: "ausbildungsordnung" },
  { title: "Betriebliche Organisation und Arbeitsabläufe", sourceKind: "ausbildungsordnung" },
  { title: "Sicherheit und Gesundheitsschutz am Arbeitsplatz", sourceKind: "ausbildungsordnung" },
  { title: "Umweltschutz und Entsorgung in der Fertigung", sourceKind: "ausbildungsordnung" },
  { title: "Werk-, Betriebs- und Hilfsstoffe zuordnen", sourceKind: "ausbildungsordnung" },
  { title: "Technische Unterlagen und Zeichnungen nutzen", sourceKind: "rahmenlehrplan" },
  { title: "Fertigen mit handgeführten Werkzeugen", sourceKind: "rahmenlehrplan" },
  { title: "Fertigen mit Maschinen — Grundlagen", sourceKind: "rahmenlehrplan" },
  { title: "Prüfverfahren und Prüfmittel wählen", sourceKind: "ausbildungsordnung" },
  { title: "Toleranzen prüfen und dokumentieren", sourceKind: "ausbildungsordnung" },
  { title: "Steuerungs- und Regelungstechnik Grundlagen", sourceKind: "ausbildungsordnung" },
  { title: "Maschinenelemente einstellen und kontrollieren", sourceKind: "ausbildungsordnung" },
  { title: "Einrichten und Inbetriebnehmen einer Maschine", sourceKind: "pruefung" },
  { title: "Umrüsten und Bedienen einer Anlage", sourceKind: "pruefung" },
  { title: "Vorbeugende Instandhaltung planen", sourceKind: "pruefung" },
  { title: "Qualitätssicherung in der Produktion", sourceKind: "pruefung" },
  { title: "Produktionsplanung und Arbeitsschritte", sourceKind: "pruefung" },
  { title: "Wirtschafts- und Sozialkunde — Betrieb und Tarif", sourceKind: "pruefung" },
  { title: "Zwischenprüfung: Struktur und Anforderungen", sourceKind: "pruefung" },
  { title: "Abschlussprüfung: Produktionstechnik Schwerpunkt", sourceKind: "pruefung" },
  { title: "Abschlussprüfung: Produktionsplanung Schwerpunkt", sourceKind: "pruefung" },
  { title: "Messungen durchführen und auswerten", sourceKind: "ausbildungsordnung" },
  { title: "Prozesse steuern und überwachen", sourceKind: "ausbildungsordnung" },
  { title: "Übergabeprotokoll und Dokumentation", sourceKind: "pruefung" },
];

const MIN_UNIT = 5;
const MAX_UNIT = 10;

/**
 * Pack topics into days of ~hoursPerDay (2–3 h), units 5–10 min.
 * Fills each day to exactly targetMinutes using 5–10 min chunks.
 */
export function buildVariantPlan(opts: {
  name: string;
  durationDays: number;
  hoursPerDay: number;
  topicOffset?: number;
}): PlanVariant {
  const targetMinutes = Math.round(opts.hoursPerDay * 60);
  // Prefer 10-min chunks; remainder must stay in [5,10] or be zero.
  const days: PlanDay[] = [];
  let topicIdx = opts.topicOffset ?? 0;

  for (let day = 1; day <= opts.durationDays; day++) {
    const units: PlanUnit[] = [];
    let remaining = targetMinutes;
    while (remaining > 0) {
      let minutes: number;
      if (remaining <= MAX_UNIT) {
        minutes = remaining;
      } else if (remaining - MAX_UNIT > 0 && remaining - MAX_UNIT < MIN_UNIT) {
        // Avoid leaving 1–4 minutes: use 5 now so leftover ≥5
        minutes = MIN_UNIT;
      } else {
        minutes = MAX_UNIT;
      }
      // Clamp illegal split: if minutes < MIN_UNIT, fold into previous
      if (minutes < MIN_UNIT) {
        if (units.length > 0) {
          units[units.length - 1]!.minutes += minutes;
        }
        break;
      }
      const topic = MAF_METALL_TOPICS[topicIdx % MAF_METALL_TOPICS.length]!;
      topicIdx += 1;
      units.push({
        id: `d${day}-u${units.length + 1}`,
        title: topic.title,
        minutes,
        sourceKind: topic.sourceKind,
      });
      remaining -= minutes;
      if (units.length >= 36) break;
    }
    days.push({ day, targetMinutes, units });
  }

  return {
    name: opts.name,
    durationDays: opts.durationDays,
    hoursPerDay: opts.hoursPerDay,
    days,
  };
}

/** Two learning variants for MAF pilot (PRODUCT: 2–3 months). */
export function mafSeedPlanVariants(): PlanVariant[] {
  return [
    buildVariantPlan({
      name: "Prüfungsvorbereitung 2 Monate",
      durationDays: 40,
      hoursPerDay: 2.5,
      topicOffset: 0,
    }),
    buildVariantPlan({
      name: "Weiterbildung 3 Monate",
      durationDays: 60,
      hoursPerDay: 2,
      topicOffset: 3,
    }),
  ];
}

export function planMeetsAcceptance(variants: PlanVariant[]): boolean {
  if (variants.length < 2) return false;
  return variants.every(
    (v) =>
      v.days.length >= 1 &&
      v.days.every(
        (d) =>
          d.units.length > 0 &&
          d.units.every((u) => u.minutes >= MIN_UNIT && u.minutes <= MAX_UNIT) &&
          d.units.reduce((s, u) => s + u.minutes, 0) >= 60 &&
          d.units.reduce((s, u) => s + u.minutes, 0) <= 3 * 60,
      ),
  );
}
