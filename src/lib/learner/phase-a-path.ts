/**
 * AP-15: Lernpfad from published Phase A (Supabase via /api/learner/phase-a).
 * Client-safe: no node:fs. Titles come from a static JSON slice of Phase-A modules/blocks.
 */
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import {
  type PathUnit,
  type PathUnitStatus,
  PLAYABLE_UNITS as SEED_UNITS,
} from "./playable-path";
import phaseAIndex from "./phase-a-index.json";
import phaseATitles from "./phase-a-titles.json";

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

function modTitle(id?: string): string {
  if (!id) return "Modul";
  return (
    (phaseATitles.modules as Record<string, string>)[id] ??
    phaseAIndex.modules.find((m) => m.id === id)?.title ??
    id
  );
}

function blockTitle(blockId?: string): string {
  if (!blockId) return "Block";
  return (phaseATitles.blocks as Record<string, string>)[blockId] ?? blockId;
}

/** Nur Einheiten mit Id, Titel und mindestens einer Frage sind spielbar (SIN-249). */
function isPlayable(u: GeneratedUnit | null | undefined): u is GeneratedUnit {
  return Boolean(
    u &&
      typeof u.id === "string" &&
      u.id &&
      typeof u.title === "string" &&
      Array.isArray(u.questions) &&
      u.questions.length > 0,
  );
}

export function mapGeneratedToPathUnits(units: GeneratedUnit[]): PathUnit[] {
  return units.filter(isPlayable).map((u, index): PathUnit => {
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
      minutes: u.minutes ?? 5,
      explanation: u.explanation ?? "",
      sections: u.sections,
      explanationSimple: u.explanationSimple,
      variant: u.variant ?? "standard",
      image: u.image,
      sourceLabel: `Quelle: ${
        (u.sourceUrl ?? "").includes("gesetze-im-internet") ? "MaschFüAusbV" : "KMK RLP"
      }`,
      moduleId: u.moduleId ?? "M0",
      moduleTitle: modTitle(u.moduleId),
      blockId: u.blockId ?? "M0-3",
      blockTitle: blockTitle(u.blockId),
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
        correct: q.correct ?? "",
        explanation: q.explanation ?? "",
        sourceUrl: q.sourceUrl ?? "",
        examAreas: q.examAreas ?? [],
        image: q.image,
        sampleSolution: q.sampleSolution,
        sampleChecklist: q.sampleChecklist,
      })),
    };
  });
}

/**
 * Schlanke Fassung für die Lernpfad-Seite (SIN-311): nur Felder, die der Pfad zeigt, und die
 * erste Frage als Vorschau. Hält das HTML klein, wenn der Server die Einheiten mitliefert.
 */
export function slimPathUnits(units: PathUnit[]): PathUnit[] {
  return units.map((u) => ({
    ...u,
    explanation: "",
    sections: undefined,
    explanationSimple: undefined,
    image: undefined,
    questions: u.questions.slice(0, 1).map((q) => ({
      id: q.id,
      type: q.type,
      level: q.level,
      prompt: q.prompt,
      correct: "",
      explanation: "",
      sourceUrl: "",
      examAreas: q.examAreas,
    })),
  }));
}

/** Sync path for SSR/tests — seed until client hydrates Phase A from API. */
export function phaseAPathUnits(): PathUnit[] {
  if (cachedUnits?.length) return cachedUnits;
  return usingPhaseASnapshot() ? SEED_UNITS : SEED_UNITS;
}

export function setPhaseAPathUnits(units: GeneratedUnit[]): PathUnit[] {
  const mapped = mapGeneratedToPathUnits(units);
  if (mapped.length) cachedUnits = mapped;
  return mapped;
}

export async function fetchPhaseAPathUnits(): Promise<PathUnit[]> {
  try {
    const res = await fetch("/api/learner/phase-a", { cache: "no-store" });
    if (!res.ok) return phaseAPathUnits();
    const data = (await res.json()) as { units?: GeneratedUnit[] };
    if (data.units?.length) {
      const mapped = setPhaseAPathUnits(data.units);
      if (mapped.length) return mapped;
    }
  } catch {
    /* seed fallback */
  }
  return phaseAPathUnits();
}
