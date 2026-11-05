/**
 * SIN-1550: Die Spalten aus SIN-1549 (Modul, Block, Gebiet, Stufe, Bild) lesen und schreiben.
 * Die Spalte gewinnt vor den Dateien (Zuordnungs-Tabellen SIN-1534, jsonb `courses.lernfeld`); die Dateien
 * bleiben Quelle für den Nachtrag und Rückfall, wo die Spalte leer ist. Weicht eine gesetzte Spalte ab, wird es gemeldet.
 */
import type { QuestionLevel, UnitImage } from "@/lib/content/didaktik";
import { gebietFuerEinheit, type GebieteTabelle } from "@/lib/content/pruefungsgebiete";
import type { GeneratedQuestion, GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import { deriveModuleBlock } from "@/lib/learner/modul-block";

export type UnitSpalten = { module_id: string | null; block_id: string | null; image: UnitImage | null };
export type QuestionSpalten = { exam_areas: string[] | null; level: QuestionLevel | null; image: UnitImage | null };

/** Felder der Einheit aus den Spalten; leere Spalten setzen nichts. */
export function unitAusSpalten(row: UnitSpalten): Pick<GeneratedUnit, "moduleId" | "blockId" | "image"> {
  return {
    ...(row.module_id ? { moduleId: row.module_id } : {}),
    ...(row.block_id ? { blockId: row.block_id } : {}),
    ...(row.image ? { image: row.image } : {}),
  };
}

/** Felder der Frage aus den Spalten; fehlt das Gebiet, gilt der Rückfall auf die Zuordnungs-Tabelle des Kurses. */
export function frageAusSpalten(
  row: QuestionSpalten,
  rueckfallGebiet?: string,
): Pick<GeneratedQuestion, "examAreas" | "level" | "image"> {
  const examAreas = row.exam_areas ?? (rueckfallGebiet ? [rueckfallGebiet] : undefined);
  return {
    ...(examAreas ? { examAreas } : {}),
    ...(row.level ? { level: row.level } : {}),
    ...(row.image ? { image: row.image } : {}),
  };
}

export function unitSpalten(u: GeneratedUnit): UnitSpalten {
  const abgeleitet = deriveModuleBlock(u.id);
  return {
    module_id: u.moduleId ?? abgeleitet?.moduleId ?? null,
    block_id: u.blockId ?? abgeleitet?.blockId ?? null,
    image: u.image ?? null,
  };
}

/** Beim Schreiben bleibt ein bekanntes Gebiet aus der Tabelle erhalten, auch wenn der Lauf keines liefert. */
export function frageSpalten(q: GeneratedQuestion, tabelle: GebieteTabelle | undefined, unitId: string): QuestionSpalten {
  const gebiet = tabelle && gebietFuerEinheit(tabelle, unitId)?.gebiet;
  return { exam_areas: q.examAreas ?? (gebiet ? [gebiet] : null), level: q.level ?? null, image: q.image ?? null };
}

/** Einheiten, deren gesetzte Spalte vom Gebiet der Zuordnungs-Tabelle abweicht (zwei Wahrheiten). */
export function gebietAbweichungen(
  tabelle: GebieteTabelle,
  units: Array<{ id: string; examAreas?: string[] }>,
): string[] {
  return units.flatMap((u) => {
    const datei = gebietFuerEinheit(tabelle, u.id)?.gebiet;
    return datei && u.examAreas?.length && u.examAreas.join(",") !== datei
      ? [`${u.id}: Spalte ${u.examAreas.join(",")}, Tabelle ${datei}`]
      : [];
  });
}
