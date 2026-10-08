import {
  goldsetFixtureAverages,
  MAF_GOLDSET_FIXTURE,
  type GoldQuestion,
} from "./maf-goldset-fixture";
import { MAF_GOLDSET_ITEMS } from "./maf-goldset";
import { GOLDSET_TARGET } from "./goldset-target";
import {
  fetchGoldsetFromLangfuse,
  langfuseConfigured,
  recordEvaluationTrace,
} from "./langfuse-client";
import { pruefpunktScores, traceTitel } from "./langfuse-names";
import {
  aggregateScores,
  scoresPass,
  type EvaluateResult,
  type QuestionEval,
  type QualityScores,
} from "./schemas";
import { loadMafCurriculum } from "@/lib/content/curriculum";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";

/** D-07: independent OpenAI family, cheapest Mini that meets the gate. */
export const JUDGE_MODEL = "gpt-5.4-mini";
/** Bump when the judge system prompt in liveJudgeChunkWithUsage changes. */
export const JUDGE_PROMPT_VERSION = "2026-10-v1";
const JUDGE_CHUNK = 10;

/** System-Prompt des Richters; auch in Langfuse Prompt Management (SIN-299). */
export const JUDGE_SYSTEM_PROMPT =
  "Du bist Richter für Lernfragen zum Maschinen- und Anlagenführer (Ausbildungsordnung, keine IHK-Originale, keine Personendaten). " +
  "Bewerte jede Frage unabhängig gegen das Modul-Niveau (Jahr 1 = Zwischenprüfung, Jahr 2+ = Abschlussprüfung) — nicht gegen einen Kurs-Mittelwert. " +
  "Skalen: sourceFidelity 0 oder 1 (1 = Antwort folgt aus der zitierten amtlichen Quelle/Erklärung). " +
  "uniqueness 0 oder 1 (1 = genau eine richtige Antwort). " +
  "niveau ganze Zahl 1,2,3,4 oder 5 — 4 = angemessen für das angegebene Modul-Jahr/Niveau, 5 schwerer; Unterstufe 1–3 nur bei offensichtlichen Fehlern. " +
  "language ganze Zahl 1,2,3,4 oder 5 — 4 verständliches Deutsch, 5 sehr klar. " +
  "safetyFlag true bei Maschinen-/Elektrosicherheit oder wenn safety=true vorgegeben ist. " +
  "Antworte ausschließlich als JSON {\"items\":[{\"id\":\"g01\",\"sourceFidelity\":1,\"uniqueness\":1,\"niveau\":4,\"language\":5,\"safetyFlag\":false,\"reasons\":[\"kurz\"]}]}";

export type EvalItem = {
  id: string;
  unitId: string;
  prompt: string;
  correct: string | string[];
  explanation: string;
  sourceUrl: string;
  /** Curriculum refs (AP-14) — niveau judged per module year, not course mean. */
  moduleId?: string;
  blockId?: string;
  year?: 1 | 2 | 3;
  niveauHint?: string;
  /** Pre-set when curriculum block/module is marked safety. */
  safety?: boolean;
};

/**
 * Evaluate generated course content against quality thresholds.
 * Live: OpenAI judge when OPENAI_API_KEY set; Langfuse trace+scores when LANGFUSE_* set.
 * Offline: fixture/heuristic judge.
 */
export async function runEvaluateAgent(opts: {
  courseId: string;
  generated?: EvalItem[];
}): Promise<EvaluateResult> {
  const items = opts.generated ?? flattenSeedQuestions();

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  let questions: QuestionEval[];
  let mode: EvaluateResult["mode"] = "fixture";
  let modelId: string | undefined;
  let warning: string | undefined;

  if (openaiKey) {
    try {
      questions = await liveJudge(openaiKey, items);
      mode = "live";
      modelId = JUDGE_MODEL;
    } catch (err) {
      questions = fixtureJudge(items);
      mode = "fixture";
      warning = `Live judge failed: ${err instanceof Error ? err.message.slice(0, 160) : String(err)}. Fixture fallback.`;
    }
  } else {
    questions = fixtureJudge(items);
    warning =
      "OPENAI_API_KEY missing — offline fixture eval. Langfuse ingest only when LANGFUSE_* set.";
  }

  const scores = aggregateScores(questions);
  const questionsPass =
    questions.length > 0 && questions.every((q) => scoresPass(q.scores));
  const meetsGoldsetTarget =
    scores.sourceFidelity >= GOLDSET_TARGET.sourceFidelity &&
    scores.uniqueness >= GOLDSET_TARGET.uniqueness &&
    scores.niveau >= Math.min(GOLDSET_TARGET.niveau, 4) &&
    scores.language >= 4;
  // Hard publish gate = PRODUCT thresholds. Goldset target is the calibrated baseline (D-25).
  const passed = questionsPass;

  let langfuseTraceId: string | undefined;
  if (langfuseConfigured()) {
    // SIN-299: fachlicher Name, Prüfpunkte mit Begründung des Richters.
    const kontext = { schritt: "pruefen" as const, modell: modelId, promptVersion: JUDGE_PROMPT_VERSION };
    const tid = await recordEvaluationTrace({
      name: traceTitel(kontext),
      courseId: opts.courseId,
      kontext,
      passed,
      scores: { safetyFlag: scores.safetyFlag },
      extraScores: pruefpunktScores(questions),
      metadata: {
        mode,
        modelId,
        goldsetTarget: GOLDSET_TARGET,
        dataset: "maf-goldset-70",
        meetsGoldsetTarget,
      },
    });
    if (tid) {
      langfuseTraceId = tid;
      if (mode === "fixture") mode = "langfuse-offline";
    }
  }

  return {
    courseId: opts.courseId,
    passed,
    scores,
    questions,
    threshold: {
      sourceFidelity: 1,
      uniqueness: 1,
      niveauMin: 4,
      languageMin: 4,
    },
    mode,
    modelId,
    runId: crypto.randomUUID(),
    promptVersion: JUDGE_PROMPT_VERSION,
    langfuseTraceId,
    warning: warning ?? (meetsGoldsetTarget ? undefined : "Below calibrated goldset target; PRODUCT thresholds still applied."),
  };
}

export function fixtureJudge(items: EvalItem[]): QuestionEval[] {
  return items.map((item) => {
    const gold = MAF_GOLDSET_FIXTURE.find((g) => g.id === item.id)
      ?? MAF_GOLDSET_ITEMS.find((g) => g.id === item.id);
    const scores = gold ? gold.expected : heuristicScores(item);
    return toQuestionEval(item, scores, []);
  });
}

function heuristicScores(item: EvalItem): QualityScores {
  const hasSource = item.sourceUrl.startsWith("http");
  const unique =
    typeof item.correct === "string"
      ? !/und auch|beide|a und b/i.test(item.correct)
      : item.correct.length === 1;
  const looksLikeExamLeak = /geheime ihk|prüfungsaufgabe kop/i.test(item.prompt);
  const safetyFlag =
    item.safety === true ||
    /sicherheit|not-halt|schutz|gefahr|elektr/i.test(`${item.prompt} ${item.explanation}`);
  // Year 1 = Zwischenprüfung, year 2+ = Abschlussprüfung — both need ≥4 at their module niveau.
  const year = item.year ?? 1;
  const baseOk =
    hasSource && item.explanation.trim().length > 12 && !looksLikeExamLeak;
  const niveau = baseOk ? 4 : year >= 2 && hasSource ? 3 : 2;
  return {
    sourceFidelity: hasSource && !looksLikeExamLeak ? 1 : 0,
    uniqueness: unique ? 1 : 0,
    niveau,
    language: item.prompt.trim().length > 0 && item.prompt.length < 400 ? 4 : 3,
    safetyFlag,
  };
}

export async function liveJudge(key: string, items: EvalItem[]): Promise<QuestionEval[]> {
  const { questions } = await liveJudgeWithUsage(key, items);
  return questions;
}

export async function liveJudgeWithUsage(
  key: string,
  items: EvalItem[],
): Promise<{ questions: QuestionEval[]; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const out: QuestionEval[] = [];
  let prompt_tokens = 0;
  let completion_tokens = 0;
  for (let i = 0; i < items.length; i += JUDGE_CHUNK) {
    const chunk = items.slice(i, i + JUDGE_CHUNK);
    const judged = await liveJudgeChunkWithUsage(key, chunk);
    out.push(...judged.questions);
    prompt_tokens += judged.usage.prompt_tokens;
    completion_tokens += judged.usage.completion_tokens;
  }
  return { questions: out, usage: { prompt_tokens, completion_tokens } };
}

export type JudgeChunkResult = {
  questions: QuestionEval[];
  usage: { prompt_tokens: number; completion_tokens: number };
};

export async function liveJudgeChunk(key: string, items: EvalItem[]): Promise<QuestionEval[]> {
  const { questions } = await liveJudgeChunkWithUsage(key, items);
  return questions;
}

export async function liveJudgeChunkWithUsage(
  key: string,
  items: EvalItem[],
): Promise<JudgeChunkResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: JUDGE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(
            items.map((i) => ({
              id: i.id,
              prompt: i.prompt,
              correct: i.correct,
              explanation: i.explanation,
              sourceUrl: i.sourceUrl,
              moduleId: i.moduleId,
              blockId: i.blockId,
              year: i.year,
              niveauHint: i.niveauHint,
              safety: i.safety,
            })),
          ),
        },
      ],
    }),
  });
  if (!res.ok) {
    // Fehlertext von OpenAI mitgeben (Modellname, Parameter, Kontingent); nie den Schlüssel.
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status} (${JUDGE_MODEL}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as {
    items?: Array<{
      id: string;
      sourceFidelity: 0 | 1;
      uniqueness: 0 | 1;
      niveau: number;
      language: number;
      safetyFlag: boolean;
      reasons?: string[];
    }>;
  };
  const byId = new Map((parsed.items ?? []).map((i) => [i.id, i]));
  const questions = items.map((item) => {
    const j = byId.get(item.id);
    const scores: QualityScores = j
      ? {
          sourceFidelity: j.sourceFidelity === 1 ? 1 : 0,
          uniqueness: j.uniqueness === 1 ? 1 : 0,
          niveau: clampScore(j.niveau),
          language: clampScore(j.language),
          safetyFlag: Boolean(j.safetyFlag),
        }
      : heuristicScores(item);
    return toQuestionEval(item, scores, j?.reasons ?? []);
  });
  return {
    questions,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n * 10) / 10));
}

function toQuestionEval(
  item: EvalItem,
  scores: QualityScores,
  reasons: string[],
): QuestionEval {
  const passed = scoresPass(scores);
  const extra = [...reasons];
  if (scores.sourceFidelity < 1) extra.push("source_fidelity_fail");
  if (scores.uniqueness < 1) extra.push("uniqueness_fail");
  if (scores.niveau < 4) extra.push("niveau_below_4");
  if (scores.language < 4) extra.push("language_below_4");
  if (scores.safetyFlag) extra.push("safety_human_sample");
  return {
    questionId: item.id,
    unitId: item.unitId,
    scores,
    passed,
    reasons: [...new Set(extra)],
  };
}

function flattenSeedQuestions(): EvalItem[] {
  const lf = mafSeedLernfeldSicherheit();
  const c = loadMafCurriculum();
  const mod = c.modules.find((m) => m.id === lf.moduleId);
  const block = mod?.blocks.find((b) => b.id === lf.blockId);
  return lf.units.flatMap((u) =>
    u.questions.map((q) => ({
      id: `${u.id}-${q.id}`,
      unitId: u.id,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
      moduleId: u.moduleId ?? lf.moduleId,
      blockId: u.blockId ?? lf.blockId,
      year: mod?.year,
      niveauHint: u.niveau ?? mod?.niveau,
      safety: u.safetyFlag ?? block?.safety ?? mod?.safety,
    })),
  );
}

export async function loadCanonicalGoldset(): Promise<GoldQuestion[]> {
  const remote = await fetchGoldsetFromLangfuse();
  if (remote && remote.length >= 70) return remote;
  return MAF_GOLDSET_ITEMS;
}

/** Offline calibration of fixture averages (unit tests). */
export function calibrateGoldsetFixture(): {
  averages: ReturnType<typeof goldsetFixtureAverages>;
  failingIds: string[];
  target: typeof GOLDSET_TARGET;
} {
  const failingIds = MAF_GOLDSET_FIXTURE.filter(
    (q: GoldQuestion) =>
      q.expected.sourceFidelity < 1 ||
      q.expected.uniqueness < 1 ||
      q.expected.niveau < 4 ||
      q.expected.language < 4,
  ).map((q) => q.id);
  return {
    averages: goldsetFixtureAverages(),
    failingIds,
    target: GOLDSET_TARGET,
  };
}
