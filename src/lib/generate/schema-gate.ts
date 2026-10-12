/**
 * SIN-473: Schema-Prüfung vor dem Speichern. Ungültige Fragen gehen einmal in die bestehende
 * Reparatur (AP-21, `repair-questions.ts`) mit den Schema-Fehlern als Grund; was danach noch
 * ungültig ist, wird verworfen und im Lauf-Bericht gezählt. Kein Netz hier: die Reparatur kommt als Funktion.
 */
import type { GeneratedQuestion, GeneratedUnit } from "./maf-lernfeld-seed";
import { MAX_QUESTIONS, type RepairPlan } from "./repair-questions";
import { emptySchemaStats, gateUnit, schemaReason, validateQuestion, type SchemaStats } from "./question-schema";

/** Erzeugt Ersatzfragen je Einheit (Id → Fragen). Fehlt eine Einheit im Ergebnis, bleibt sie ohne Ersatz. */
export type RepairFn = (items: Array<{ unit: GeneratedUnit; plan: RepairPlan }>) => Promise<Map<string, GeneratedQuestion[]>>;

export async function enforceQuestionSchema(
  units: GeneratedUnit[],
  repair: RepairFn,
): Promise<{ units: GeneratedUnit[]; stats: SchemaStats }> {
  const stats = emptySchemaStats();
  const gated = units.map(gateUnit);
  const items: Array<{ unit: GeneratedUnit; plan: RepairPlan }> = [];
  for (const g of gated) {
    stats.generated += g.unit.questions.length + g.invalid.length;
    stats.invalid += g.invalid.length;
    if (g.invalid.length === 0) continue;
    const kept = g.unit.questions;
    items.push({
      unit: g.unit,
      plan: {
        unitId: g.unit.id,
        kept,
        failed: g.invalid.map((i) => ({ question: i.question, reason: schemaReason(i.errors) })),
        replacements: Math.min(g.invalid.length, MAX_QUESTIONS - kept.length),
        alreadyPublishable: false,
      },
    });
  }

  const replacements = items.length > 0 ? await repair(items) : new Map<string, GeneratedQuestion[]>();
  const out = gated.map((g) => {
    const item = items.find((i) => i.unit.id === g.unit.id);
    if (!item) return g.unit;
    const fresh = (replacements.get(g.unit.id) ?? [])
      .filter((q) => validateQuestion(q).ok)
      .slice(0, item.plan.replacements);
    stats.repaired += fresh.length;
    return { ...g.unit, questions: [...g.unit.questions, ...fresh] };
  });
  stats.discarded = stats.invalid - stats.repaired;
  return { units: out, stats };
}
