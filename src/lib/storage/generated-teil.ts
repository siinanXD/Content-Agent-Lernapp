/**
 * SIN-861: setGenerated nur für geänderte Einheiten. Große Kurse (700 bis 900 Einheiten) liefen sonst
 * bei jedem Aufruf in Supabase-Timeouts: ganzer Kurs lesen, Zeile für Zeile löschen, volle jsonb schreiben.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type TeilOptionen = {
  /** Nur diese Einheiten (und ihre Fragen) schreiben und auf verwaiste Fragen prüfen. */
  changedUnitIds: readonly string[];
  /** Volle `courses.lernfeld`-jsonb schreiben. Zwischenstände lassen sie weg, der Lauf schreibt sie am Ende. */
  lernfeld: boolean;
};

type UnitRow = { id: string };
type QuestionRow = { id: string; unit_id: string };

const BLOCK = 100;

function bloecke<T>(xs: readonly T[], n = BLOCK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

export async function schreibeTeil(
  sb: SupabaseClient,
  courseId: string,
  unitRows: readonly UnitRow[],
  questionRows: readonly QuestionRow[],
  generated: unknown,
  opts: TeilOptionen,
): Promise<void> {
  const changed = new Set(opts.changedUnitIds);
  const units = unitRows.filter((u) => changed.has(u.id));
  const questions = questionRows.filter((q) => changed.has(q.unit_id));

  for (const block of bloecke(units)) {
    const { error } = await sb.from("units").upsert(block, { onConflict: "course_id,id" });
    if (error) throw new Error(`units_insert: ${error.message}`);
  }
  for (const block of bloecke(questions)) {
    const { error } = await sb.from("questions").upsert(block, { onConflict: "course_id,unit_id,id" });
    if (error) throw new Error(`questions_insert: ${error.message}`);
  }

  // Verwaiste Fragen nur der geschriebenen Einheiten, in Blöcken gelöscht.
  const keep = new Set(questions.map((q) => `${q.unit_id}\u0000${q.id}`));
  for (const unitBlock of bloecke(units.map((u) => u.id), 20)) {
    const { data: old, error } = await sb
      .from("questions")
      .select("id, unit_id")
      .eq("course_id", courseId)
      .in("unit_id", unitBlock);
    if (error) throw new Error(`questions_clear: ${error.message}`);
    const orphans = ((old ?? []) as QuestionRow[]).filter((r) => !keep.has(`${r.unit_id}\u0000${r.id}`));
    const byUnit = new Map<string, string[]>();
    for (const o of orphans) byUnit.set(o.unit_id, [...(byUnit.get(o.unit_id) ?? []), o.id]);
    for (const [unitId, ids] of byUnit) {
      for (const idBlock of bloecke(ids)) {
        const { error: delErr } = await sb
          .from("questions")
          .delete()
          .eq("course_id", courseId)
          .eq("unit_id", unitId)
          .in("id", idBlock);
        if (delErr) throw new Error(`questions_clear: ${delErr.message}`);
      }
    }
  }

  const { error: stErr } = await sb
    .from("courses")
    .update({
      status: "generated",
      ...(opts.lernfeld ? { lernfeld: generated } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);
  if (stErr) throw new Error(`courses_generated: ${stErr.message}`);
}
