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
import {
  aggregateScores,
  scoresPass,
  type EvaluateResult,
  type QuestionEval,
  type QualityScores,
} from "./schemas";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";

/** D-07: independent OpenAI family, cheapest Mini that meets the gate. */
export const JUDGE_MODEL = "gpt-5.4-mini";
const JUDGE_CHUNK = 10;

type EvalItem = {
  id: string;
  unitId: string;
  prompt: string;
  correct: string | string[];
  explanation: string;
  sourceUrl: string;
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
    const tid = await recordEvaluationTrace({
      name: "course-evaluate",
      courseId: opts.courseId,
      passed,
      scores: {
        sourceFidelity: scores.sourceFidelity,
        uniqueness: scores.uniqueness,
        niveau: scores.niveau,
        language: scores.language,
        safetyFlag: scores.safetyFlag,
      },
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
  const safetyFlag = /sicherheit|not-halt|schutz|gefahr|elektr/i.test(
    `${item.prompt} ${item.explanation}`,
  );
  return {
    sourceFidelity: hasSource && !looksLikeExamLeak ? 1 : 0,
    uniqueness: unique ? 1 : 0,
    niveau: hasSource && item.explanation.trim().length > 12 && !looksLikeExamLeak ? 4 : 2,
    language: item.prompt.trim().length > 0 && item.prompt.length < 400 ? 4 : 3,
    safetyFlag,
  };
}

export async function liveJudge(key: string, items: EvalItem[]): Promise<QuestionEval[]> {
  const out: QuestionEval[] = [];
  for (let i = 0; i < items.length; i += JUDGE_CHUNK) {
    const chunk = items.slice(i, i + JUDGE_CHUNK);
    const judged = await liveJudgeChunk(key, chunk);
    out.push(...judged);
  }
  return out;
}

async function liveJudgeChunk(key: string, items: EvalItem[]): Promise<QuestionEval[]> {
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
          content:
            "Du bist Richter für Lernfragen zum Maschinen- und Anlagenführer (Ausbildungsordnung, keine IHK-Originale, keine Personendaten). " +
            "Bewerte jede Frage unabhängig. Skalen: sourceFidelity 0 oder 1 (1 = Antwort folgt aus der zitierten amtlichen Quelle/Erklärung). " +
            "uniqueness 0 oder 1 (1 = genau eine richtige Antwort). " +
            "niveau ganze Zahl 1,2,3,4 oder 5 — 4 ist Prüfungsniveau der Ausbildung, 5 schwerer; Unterstufe 1–3 nur bei offensichtlichen Fehlern. " +
            "language ganze Zahl 1,2,3,4 oder 5 — 4 verständliches Deutsch, 5 sehr klar. " +
            "safetyFlag true nur bei Maschinen-/Elektrosicherheit. " +
            "Antworte ausschließlich als JSON {\"items\":[{\"id\":\"g01\",\"sourceFidelity\":1,\"uniqueness\":1,\"niveau\":4,\"language\":5,\"safetyFlag\":false,\"reasons\":[\"kurz\"]}]}",
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
            })),
          ),
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}`);
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
  return items.map((item) => {
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
  return lf.units.flatMap((u) =>
    u.questions.map((q) => ({
      id: `${u.id}-${q.id}`,
      unitId: u.id,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
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
