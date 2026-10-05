/**
 * AP-21 / SIN-218: nur durchgefallene Fragen ersetzen, nicht die ganze Einheit.
 * Reine Funktionen (kein Netz): Plan, Prompt, Parser, Merge. Batch-Aufruf in batch-generate.ts.
 */
import type { GeneratedQuestion, GeneratedUnit } from "./maf-lernfeld-seed";
import type { QuestionEvaluationRecord } from "@/lib/quality/question-evaluations";
import type { QuestionEval } from "@/lib/quality/schemas";

/** PRODUCT.md: 5–8 Fragen je Einheit. Eine Einheit geht live, wenn mindestens so viele bestanden haben. */
export const MIN_PASSED_QUESTIONS = 5;
export const MAX_QUESTIONS = 8;

/** Id, unter der der Richter eine Frage führt (siehe flattenUnits in den ap15-Skripten). */
export function evalQuestionId(unitId: string, questionId: string): string {
  return `${unitId}-${questionId}`;
}

export type FailedQuestion = { question: GeneratedQuestion; reason: string };

export type RepairPlan = {
  unitId: string;
  /** Bereits bestandene Fragen (bleiben unverändert). */
  kept: GeneratedQuestion[];
  /** Durchgefallen oder nicht bewertet, mit Grund des Richters. */
  failed: FailedQuestion[];
  /** Anzahl Ersatzfragen, die erzeugt werden. 0, wenn die Einheit schon ≥5 bestandene hat. */
  replacements: number;
  /** Schon ohne Ersatz live-fähig. */
  alreadyPublishable: boolean;
};

/**
 * Plan aus der Einheit und dem jeweils letzten Richter-Ergebnis je Frage
 * (`question_quality_latest`). Fragen ohne Ergebnis zählen als nicht bestanden.
 */
export function planQuestionRepair(
  unit: GeneratedUnit,
  latest: Array<Pick<QuestionEvaluationRecord, "questionId" | "unitId" | "passed" | "reason">>,
): RepairPlan {
  const byQuestion = new Map(
    latest.filter((e) => e.unitId === unit.id).map((e) => [e.questionId, e]),
  );
  const kept: GeneratedQuestion[] = [];
  const failed: FailedQuestion[] = [];
  for (const q of unit.questions) {
    const ev = byQuestion.get(evalQuestionId(unit.id, q.id));
    if (ev?.passed) kept.push(q);
    else failed.push({ question: q, reason: ev?.reason?.trim() || (ev ? "ohne Begründung" : "nicht bewertet") });
  }
  return buildPlan(unit.id, kept, failed);
}

function buildPlan(unitId: string, kept: GeneratedQuestion[], failed: FailedQuestion[]): RepairPlan {
  const alreadyPublishable = kept.length >= MIN_PASSED_QUESTIONS;
  const replacements = alreadyPublishable
    ? 0
    : Math.min(Math.max(failed.length, MIN_PASSED_QUESTIONS - kept.length), MAX_QUESTIONS - kept.length);
  return { unitId, kept, failed, replacements, alreadyPublishable };
}

/** Prompt: Einheit + nur die durchgefallenen Fragen mit Grund. Ausgabe: nur Ersatzfragen. */
export function buildRepairPrompt(unit: GeneratedUnit, plan: RepairPlan): string {
  const kern = unit.sections?.kern ?? unit.explanation;
  const failedBlock = plan.failed
    .map(
      (f, i) =>
        `${i + 1}. Frage (${f.question.id}): ${f.question.prompt}\n   Richtige Antwort: ${JSON.stringify(f.question.correct)}\n   Grund des Richters: ${f.reason}`,
    )
    .join("\n");
  const keptBlock = plan.kept.map((q) => `- ${q.prompt}`).join("\n") || "- (keine)";
  return `Nachbesserung für die Einheit "${unit.title}" (${unit.id}), Niveau ${unit.niveau ?? "laut Modul"}.
Quelle (nur diese zitieren): ${unit.sourceUrl}, Abrufdatum ${unit.sourceFetchedAt}.
Einheiten-Text:
${kern}

Diese Fragen sind durch die Qualitäts-Schranke gefallen:
${failedBlock}

Diese Fragen sind bestanden und bleiben. Nicht wiederholen, keine inhaltlichen Dubletten:
${keptBlock}

Erzeuge genau ${plan.replacements} neue Ersatzfragen zum selben Einheiten-Text. Behebe jeweils den genannten Grund: eine korrekte Quelle, genau eine richtige Antwort, Niveau und Sprache passend zum Modul. Fragen in dieser Reihenfolge anbieten und Typen wie bei den ersetzten Fragen mischen.
Verboten: IHK-Prüfungsaufgaben oder Umformulierung, Personendaten, Inhalte ohne Quelle. Die Einheit selbst nicht neu schreiben.
Jede Frage hat dieselben Felder wie die ersetzten (id, type, level, prompt, choices/pairs/steps/blanks, correct, explanation, sourceUrl, examAreas).
Antworte nur mit JSON: {"questions":[...]}`;
}

export function parseRepairQuestions(text: string): GeneratedQuestion[] | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as { questions?: GeneratedQuestion[] };
    return Array.isArray(obj.questions) && obj.questions.length ? obj.questions : null;
  } catch {
    return null;
  }
}

/** Neue Ersatzfragen bekommen eigene Ids (`r1`, `r2`, …), damit Richter-Historie je Frage eindeutig bleibt. */
export function annotateRepairQuestions(
  unit: GeneratedUnit,
  questions: GeneratedQuestion[],
  round = 1,
): GeneratedQuestion[] {
  const taken = new Set(unit.questions.map((q) => q.id));
  const out: GeneratedQuestion[] = [];
  let n = 0;
  for (const q of questions) {
    let id: string;
    do id = `r${round}-${++n}`;
    while (taken.has(id));
    taken.add(id);
    out.push({
      ...q,
      id,
      type: q.type || "auswahl",
      prompt: q.prompt || "",
      correct: q.correct ?? "",
      explanation: q.explanation || "",
      sourceUrl: q.sourceUrl || unit.sourceUrl,
    });
  }
  return out;
}

export type RepairOutcome = {
  unit: GeneratedUnit;
  passedCount: number;
  /** ≥ MIN_PASSED_QUESTIONS bestanden → live. */
  publishable: boolean;
  /** Gründe der Fragen, die auch im Ersatz durchfielen (für die Begründung bei Verwurf). */
  stillFailedReasons: string[];
  /** Plan für eine weitere Reparatur-Runde (nur die neu durchgefallenen Fragen). */
  nextPlan: RepairPlan;
};

/**
 * Bestandene Alt-Fragen + bestandene Ersatzfragen. Durchgefallene Fragen kommen nie in die Einheit.
 * Der Richter hat nur die neuen Fragen bewertet (`newEvals`).
 */
export function applyRepair(
  unit: GeneratedUnit,
  plan: RepairPlan,
  newQuestions: GeneratedQuestion[],
  newEvals: QuestionEval[],
): RepairOutcome {
  const result = new Map(newEvals.map((e) => [e.questionId, e]));
  const passedNew: GeneratedQuestion[] = [];
  const stillFailed: FailedQuestion[] = [];
  for (const q of newQuestions) {
    const ev = result.get(evalQuestionId(unit.id, q.id));
    if (ev?.passed) passedNew.push(q);
    else stillFailed.push({ question: q, reason: ev?.reasons.join("; ") || "nicht bewertet" });
  }
  const questions = [...plan.kept, ...passedNew].slice(0, MAX_QUESTIONS);
  return {
    unit: { ...unit, questions },
    passedCount: questions.length,
    publishable: questions.length >= MIN_PASSED_QUESTIONS,
    stillFailedReasons: stillFailed.map((f) => `${f.question.id}: ${f.reason}`),
    nextPlan: buildPlan(unit.id, questions, stillFailed),
  };
}

/**
 * Einheit nach dem Richter-Lauf (Bootstrap: Einheit wurde komplett neu erzeugt, nichts war vorher bewertet):
 * nur bestandene Fragen behalten, Plan für die Reparatur der Rest ableiten.
 */
export function planFromEvals(unit: GeneratedUnit, evals: QuestionEval[]): RepairPlan {
  return planQuestionRepair(
    unit,
    evals.map((e) => ({
      questionId: e.questionId,
      unitId: e.unitId,
      passed: e.passed,
      reason: e.reasons.join("; ") || undefined,
    })),
  );
}
