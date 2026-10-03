/**
 * Exam mode from curriculum exam.gradedParts (AP-18c).
 * Open tasks: sample solution + checklist only — never AI graded.
 */

import {
  examQuestionTarget,
  parseDurationMinutes,
  trafficLight,
  trafficLabel,
  type ExamSet,
  type TrafficLight,
} from "@/lib/content/didaktik";
import {
  loadMafCurriculum,
  type Curriculum,
  type ExamPart,
} from "@/lib/content/curriculum";
import type { GeneratedQuestion } from "@/lib/generate/maf-lernfeld-seed";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";
import { PLAYABLE_UNITS, type PathQuestion } from "@/lib/learner/playable-path";

export type ExamPartView = {
  id: string;
  title: string;
  bereich: string;
  form: ExamPart["form"];
  durationMinutes: number | null;
  weightPercent: number | null;
  simulated: boolean;
  questionTarget: number;
  gebiete: Array<{ id: string; title: string }>;
};

export type AreaResult = {
  areaId: string;
  title: string;
  correct: number;
  total: number;
  ratio: number;
  light: TrafficLight;
  label: string;
};

/** Written graded parts only — practical / Fachaufgabe not simulated (DIDAKTIK §6). */
export function listExamParts(c: Curriculum = loadMafCurriculum()): ExamPartView[] {
  return c.exam.gradedParts.map((p) => {
    const durationMinutes = parseDurationMinutes(p.duration);
    const simulated = p.form === "schriftlich";
    return {
      id: p.id,
      title: `${p.part}: ${p.bereich}`,
      bereich: p.bereich,
      form: p.form,
      durationMinutes,
      weightPercent: p.weightPercent,
      simulated,
      questionTarget: simulated ? examQuestionTarget(p.id, durationMinutes) : 0,
      gebiete: p.gebiete,
    };
  });
}

export function buildExamSet(
  partId: string,
  c: Curriculum = loadMafCurriculum(),
): ExamSet | null {
  const part = c.exam.gradedParts.find((p) => p.id === partId);
  if (!part || part.form !== "schriftlich") return null;
  const durationMinutes = parseDurationMinutes(part.duration) ?? 60;
  const target = examQuestionTarget(part.id, durationMinutes);
  const pool = collectQuestionsForPart(part, c);
  const questionIds = pool.slice(0, Math.max(target, 1)).map((q) => q.id);
  return {
    id: `exam-${c.id}-${part.id}`,
    mapId: c.id,
    partId: part.id,
    durationMinutes,
    questionIds,
  };
}

function collectQuestionsForPart(
  part: ExamPart,
  c: Curriculum,
): PathQuestion[] {
  const areaIds = new Set<string>([part.id, ...part.gebiete.map((g) => g.id)]);
  const fromPlayable = PLAYABLE_UNITS.flatMap((u) =>
    u.questions.filter((q) =>
      q.examAreas.some((a) => areaIds.has(a) || a === "WISO-1"),
    ),
  );
  if (fromPlayable.length > 0) {
    // Prefer playable demo questions; pad by cycling if needed for UI demo.
    const padded = [...fromPlayable];
    let i = 0;
    while (padded.length < examQuestionTarget(part.id, parseDurationMinutes(part.duration))) {
      const base = fromPlayable[i % fromPlayable.length]!;
      padded.push({ ...base, id: `${base.id}-pad-${padded.length}` });
      i += 1;
      if (i > 80) break;
    }
    return padded;
  }
  const seed = mafSeedLernfeldSicherheit();
  return seed.units.flatMap((u) =>
    u.questions
      .filter((q) => (q.examAreas ?? []).some((a) => areaIds.has(a)))
      .map(seedQuestionToPath),
  );
}

function seedQuestionToPath(q: GeneratedQuestion): PathQuestion {
  return {
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
  };
}

export function getExamQuestions(partId: string): PathQuestion[] {
  const set = buildExamSet(partId);
  if (!set) return [];
  const byId = new Map(
    PLAYABLE_UNITS.flatMap((u) => u.questions).map((q) => [q.id, q] as const),
  );
  // padded ids fall back to base question content
  return set.questionIds
    .map((id) => {
      const direct = byId.get(id);
      if (direct) return direct;
      const baseId = id.replace(/-pad-\d+$/, "");
      const base = byId.get(baseId);
      return base ? { ...base, id } : undefined;
    })
    .filter((q): q is PathQuestion => Boolean(q));
}

export function scoreByArea(
  answers: Array<{ questionId: string; correct: boolean; examAreas: string[] }>,
  gebiete: Array<{ id: string; title: string }>,
): AreaResult[] {
  const areas =
    gebiete.length > 0
      ? gebiete
      : [{ id: "ALL", title: "Gesamt" }];

  return areas.map((g) => {
    const relevant = answers.filter(
      (a) => g.id === "ALL" || a.examAreas.includes(g.id) || a.examAreas.includes("WISO-1"),
    );
    const total = relevant.length || answers.length;
    const correct = (relevant.length ? relevant : answers).filter((a) => a.correct).length;
    const ratio = total === 0 ? 0 : correct / total;
    const light = trafficLight(ratio);
    return {
      areaId: g.id,
      title: g.title,
      correct,
      total,
      ratio,
      light,
      label: trafficLabel(light),
    };
  });
}

export function mafExamTimesSummary(): string {
  return "MAF schriftlich: PT 120 / PP 60 / WiSo 60 Minuten (MaschFüAusbV § 9).";
}
