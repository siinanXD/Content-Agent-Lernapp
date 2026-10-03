/**
 * AP-15: Lernpfad from published Phase A (Supabase via /api/learner/phase-a).
 * Client fetches live units; server helpers use index metadata. Seed fallback if empty.
 */
import { loadMafCurriculum } from "@/lib/content/curriculum";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import {
  type PathUnit,
  type PathUnitStatus,
  PLAYABLE_UNITS as SEED_UNITS,
} from "./playable-path";
import phaseAIndex from "./phase-a-index.json";

export type PhaseASnapshot = {
  courseId: string;
  keyword: string;
  phase: string;
  publishedAt: string;
  unitCount: number;
  units: GeneratedUnit[];
};

let cachedUnits: PathUnit[] | null = null;

export function phaseAIndexMeta() {
  return phaseAIndex;
}

export function usingPhaseASnapshot(): boolean {
  return Boolean(phaseAIndex.courseId && phaseAIndex.unitCount > 0);
}

export function mapGeneratedToPathUnits(units: GeneratedUnit[]): PathUnit[] {
  const curriculum = loadMafCurriculum();
  const modTitle = (id?: string) =>
    curriculum.modules.find((m) => m.id === id)?.title ?? id ?? "Modul";
  const blockTitle = (moduleId?: string, blockId?: string) => {
    const mod = curriculum.modules.find((m) => m.id === moduleId);
    return mod?.blocks.find((b) => b.id === blockId)?.title ?? blockId ?? "Block";
  };

  return units.map((u, index): PathUnit => {
    let status: PathUnitStatus = "open";
    let statusLabel = "Noch offen";
    if (index < 2) {
      status = "done";
      statusLabel = "Abgeschlossen";
    } else if (index < 6) {
      status = "today";
      statusLabel = "Teil des Tagesziels";
    }
    return {
      id: u.id,
      indexLabel: String(index + 1).padStart(2, "0"),
      title: u.title,
      status,
      statusLabel,
      minutes: u.minutes,
      explanation: u.explanation,
      sections: u.sections,
      explanationSimple: u.explanationSimple,
      variant: u.variant ?? "standard",
      image: u.image,
      sourceLabel: `Quelle: ${
        u.sourceUrl.includes("gesetze-im-internet") ? "MaschFüAusbV" : "KMK RLP"
      }`,
      moduleId: u.moduleId ?? "M0",
      moduleTitle: modTitle(u.moduleId),
      blockId: u.blockId ?? "M0-3",
      blockTitle: blockTitle(u.moduleId, u.blockId),
      examAreas: u.questions[0]?.examAreas ?? [],
      questions: u.questions.map((q) => ({
        id: q.id,
        type: q.type,
        level: q.level ?? "verstehen",
        prompt: q.prompt,
        choices: q.choices,
        pairs: q.pairs,
        steps: q.steps,
        blanks: q.blanks,
        correct: q.correct,
        explanation: q.explanation,
        sourceUrl: q.sourceUrl,
        examAreas: q.examAreas ?? [],
        image: q.image,
        sampleSolution: q.sampleSolution,
        sampleChecklist: q.sampleChecklist,
      })),
    };
  });
}

/** Sync path for SSR/tests — seed until client hydrates Phase A from API. */
export function phaseAPathUnits(): PathUnit[] {
  if (cachedUnits?.length) return cachedUnits;
  return usingPhaseASnapshot() ? SEED_UNITS : SEED_UNITS;
}

export function setPhaseAPathUnits(units: GeneratedUnit[]): PathUnit[] {
  cachedUnits = mapGeneratedToPathUnits(units);
  return cachedUnits;
}

export async function fetchPhaseAPathUnits(): Promise<PathUnit[]> {
  try {
    const res = await fetch("/api/learner/phase-a", { cache: "no-store" });
    if (!res.ok) return phaseAPathUnits();
    const data = (await res.json()) as { units?: GeneratedUnit[] };
    if (data.units?.length) return setPhaseAPathUnits(data.units);
  } catch {
    /* seed fallback */
  }
  return phaseAPathUnits();
}
