/**
 * MAF day plans from docs/content/maf-curriculum.json (AP-14).
 * Modules run in `order`; M0 (Querschnitt) is interleaved about every 5th unit.
 * Seed path needs no API key. No IHK exam task text — titles from the map only.
 */
import {
  loadMafCurriculum,
  type Curriculum,
  type CurriculumBlock,
  type CurriculumModule,
  type CurriculumSource,
} from "@/lib/content/maf-curriculum";

export type PlanUnit = {
  id: string;
  title: string;
  minutes: number;
  sourceKind: CurriculumSource["kind"];
  moduleId: string;
  blockId: string;
  niveau: string;
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

export type CurriculumSlot = {
  moduleId: string;
  blockId: string;
  title: string;
  sourceKind: CurriculumSource["kind"];
  niveau: string;
};

const MIN_UNIT = 5;
const MAX_UNIT = 10;

/** Expand curriculum into ordered content slots (main modules + M0 pool). */
export function curriculumSlots(c: Curriculum = loadMafCurriculum()): {
  main: CurriculumSlot[];
  m0: CurriculumSlot[];
} {
  const byId = new Map(c.sources.map((s) => [s.id, s]));
  const toSlots = (mod: CurriculumModule, block: CurriculumBlock): CurriculumSlot[] => {
    const primary = block.sourceIds.map((id) => byId.get(id)).find(Boolean);
    const sourceKind = primary?.kind ?? kindFallback(mod.kind);
    const topics = block.topics.length > 0 ? block.topics : [block.title];
    const slots: CurriculumSlot[] = [];
    for (let i = 0; i < block.units; i++) {
      slots.push({
        moduleId: mod.id,
        blockId: block.id,
        title: topics[i % topics.length]!,
        sourceKind,
        niveau: mod.niveau,
      });
    }
    return slots;
  };

  const ordered = [...c.modules].sort((a, b) => a.order - b.order);
  const m0Mod = ordered.find((m) => m.id === "M0");
  const m0 = m0Mod ? m0Mod.blocks.flatMap((b) => toSlots(m0Mod, b)) : [];
  const main = ordered
    .filter((m) => m.id !== "M0")
    .flatMap((m) => m.blocks.flatMap((b) => toSlots(m, b)));
  return { main, m0 };
}

/**
 * Interleave M0 roughly every 5th unit while walking main modules in order.
 * Yields an infinite-safe cycle so short day plans always have titles.
 */
export function* interleavedCurriculumUnits(
  c: Curriculum = loadMafCurriculum(),
): Generator<CurriculumSlot> {
  const { main, m0 } = curriculumSlots(c);
  const mainPool = main.length > 0 ? main : m0;
  const m0Pool = m0.length > 0 ? m0 : mainPool;
  let mainIdx = 0;
  let m0Idx = 0;
  let n = 0;
  while (true) {
    n += 1;
    const useM0 = n % 5 === 0;
    if (useM0) {
      yield m0Pool[m0Idx % m0Pool.length]!;
      m0Idx += 1;
    } else {
      yield mainPool[mainIdx % mainPool.length]!;
      mainIdx += 1;
    }
  }
}

function kindFallback(kind: CurriculumModule["kind"]): CurriculumSource["kind"] {
  if (kind === "lernfeld") return "rahmenlehrplan";
  if (kind === "pruefung" || kind === "wiso") return "pruefung";
  return "ausbildungsordnung";
}

/**
 * Pack curriculum slots into days of ~hoursPerDay (2–3 h), units 5–10 min.
 * Fills each day to exactly targetMinutes using 5–10 min chunks.
 */
export function buildVariantPlan(opts: {
  name: string;
  durationDays: number;
  hoursPerDay: number;
  /** Skip this many interleaved slots (second variant starts later in the map). */
  slotOffset?: number;
  curriculum?: Curriculum;
}): PlanVariant {
  const targetMinutes = Math.round(opts.hoursPerDay * 60);
  const days: PlanDay[] = [];
  const iter = interleavedCurriculumUnits(opts.curriculum);
  for (let i = 0; i < (opts.slotOffset ?? 0); i++) iter.next();

  for (let day = 1; day <= opts.durationDays; day++) {
    const units: PlanUnit[] = [];
    let remaining = targetMinutes;
    while (remaining > 0) {
      let minutes: number;
      if (remaining <= MAX_UNIT) {
        minutes = remaining;
      } else if (remaining - MAX_UNIT > 0 && remaining - MAX_UNIT < MIN_UNIT) {
        minutes = MIN_UNIT;
      } else {
        minutes = MAX_UNIT;
      }
      if (minutes < MIN_UNIT) {
        if (units.length > 0) {
          units[units.length - 1]!.minutes += minutes;
        }
        break;
      }
      const slot = iter.next().value!;
      units.push({
        id: `d${day}-u${units.length + 1}`,
        title: slot.title,
        minutes,
        sourceKind: slot.sourceKind,
        moduleId: slot.moduleId,
        blockId: slot.blockId,
        niveau: slot.niveau,
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
export function mafSeedPlanVariants(curriculum?: Curriculum): PlanVariant[] {
  const c = curriculum ?? loadMafCurriculum();
  return [
    buildVariantPlan({
      name: "Prüfungsvorbereitung 2 Monate",
      durationDays: 40,
      hoursPerDay: 2.5,
      slotOffset: 0,
      curriculum: c,
    }),
    buildVariantPlan({
      name: "Weiterbildung 3 Monate",
      durationDays: 60,
      hoursPerDay: 2,
      slotOffset: 12,
      curriculum: c,
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
          d.units.every(
            (u) =>
              u.minutes >= MIN_UNIT &&
              u.minutes <= MAX_UNIT &&
              Boolean(u.moduleId) &&
              Boolean(u.blockId) &&
              Boolean(u.niveau) &&
              Boolean(u.sourceKind),
          ) &&
          d.units.reduce((s, u) => s + u.minutes, 0) >= 60 &&
          d.units.reduce((s, u) => s + u.minutes, 0) <= 3 * 60,
      ),
  );
}
