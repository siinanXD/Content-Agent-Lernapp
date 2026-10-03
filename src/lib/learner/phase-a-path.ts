/**
 * AP-15: Lernpfad from published Phase A snapshot (Supabase-backed generation).
 * Falls back to Sicherheit seed only when snapshot missing / empty.
 */
import { loadMafCurriculum } from "@/lib/content/curriculum";
import type { GeneratedUnit } from "@/lib/generate/maf-lernfeld-seed";
import {
  type PathUnit,
  type PathUnitStatus,
  PLAYABLE_UNITS as SEED_UNITS,
} from "./playable-path";

export type PhaseASnapshot = {
  courseId: string;
  keyword: string;
  phase: string;
  publishedAt: string;
  unitCount: number;
  units: GeneratedUnit[];
};

let cached: PhaseASnapshot | null | undefined;

export function loadPhaseASnapshot(): PhaseASnapshot | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require("./phase-a-published.json") as PhaseASnapshot;
    cached = data?.units?.length ? data : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function phaseAPathUnits(): PathUnit[] {
  const snap = loadPhaseASnapshot();
  if (!snap?.units?.length) return SEED_UNITS;

  const curriculum = loadMafCurriculum();
  const modTitle = (id?: string) =>
    curriculum.modules.find((m) => m.id === id)?.title ?? id ?? "Modul";
  const blockTitle = (moduleId?: string, blockId?: string) => {
    const mod = curriculum.modules.find((m) => m.id === moduleId);
    return mod?.blocks.find((b) => b.id === blockId)?.title ?? blockId ?? "Block";
  };

  return snap.units.map((u, index): PathUnit => {
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
      sourceLabel: `Quelle: ${u.sourceUrl.includes("gesetze-im-internet") ? "MaschFüAusbV" : "KMK RLP"}`,
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

export function usingPhaseASnapshot(): boolean {
  return Boolean(loadPhaseASnapshot()?.units?.length);
}
