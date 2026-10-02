import {
  goldsetFixtureAverages,
  MAF_GOLDSET_FIXTURE,
  type GoldQuestion,
} from "./maf-goldset-fixture";
import { langfuseConfigured, recordEvaluationTrace } from "./langfuse-client";
import {
  aggregateScores,
  GOLDSET_TARGET,
  scoresPass,
  type EvaluateResult,
  type QuestionEval,
  type QualityScores,
} from "./schemas";
import { mafSeedLernfeldSicherheit } from "@/lib/generate/maf-lernfeld-seed";

const JUDGE_MODEL = "gpt-5.4-mini";

/**
 * Evaluate generated course content against quality thresholds.
 * Offline: fixture-based judge heuristics (no API keys).
 * Live: OpenAI judge when OPENAI_API_KEY set; Langfuse trace when configured.
 */
export async function runEvaluateAgent(opts: {
  courseId: string;
  /** Generated questions to score; defaults to seed Lernfeld questions */
  generated?: Array<{
    id: string;
    unitId: string;
    prompt: string;
    correct: string | string[];
    explanation: string;
    sourceUrl: string;
  }>;
}): Promise<EvaluateResult> {
  const items =
    opts.generated ??
    flattenSeedQuestions().map((q) => ({
      id: q.id,
      unitId: q.unitId,
      prompt: q.prompt,
      correct: q.correct,
      explanation: q.explanation,
      sourceUrl: q.sourceUrl,
    }));

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  let questions: QuestionEval[];
  let mode: EvaluateResult["mode"] = "fixture";
  let modelId: string | undefined;
  let warning: string | undefined;

  if (openaiKey) {
    try {
      const live = await liveJudge(openaiKey, items);
      questions = live;
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
      "OPENAI_API_KEY missing — offline fixture eval. Langfuse live ingest only when LANGFUSE_* set.";
  }

  const scores = aggregateScores(questions);
  // Hard gate: every question must meet PRODUCT thresholds. safetyFlag is advisory
  // (human Stichprobe) and does not alone fail publish.
  const passed =
    questions.length > 0 && questions.every((q) => scoresPass(q.scores));

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
      metadata: { mode, modelId, goldsetTarget: GOLDSET_TARGET },
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
    warning,
  };
}

/** Offline judge: match against goldset expected scores or heuristic. */
export function fixtureJudge(
  items: Array<{
    id: string;
    unitId: string;
    prompt: string;
    correct: string | string[];
    explanation: string;
    sourceUrl: string;
  }>,
): QuestionEval[] {
  return items.map((item) => {
    const gold = MAF_GOLDSET_FIXTURE.find((g) => g.id === item.id);
    const scores = gold ? gold.expected : heuristicScores(item);
    const passed = scoresPass(scores);
    const reasons: string[] = [];
    if (scores.sourceFidelity < 1) reasons.push("source_fidelity_fail");
    if (scores.uniqueness < 1) reasons.push("uniqueness_fail");
    if (scores.niveau < 4) reasons.push("niveau_below_4");
    if (scores.language < 4) reasons.push("language_below_4");
    if (scores.safetyFlag) reasons.push("safety_human_sample");
    return {
      questionId: item.id,
      unitId: item.unitId,
      scores,
      passed,
      reasons,
    };
  });
}

function heuristicScores(item: {
  prompt: string;
  correct: string | string[];
  explanation: string;
  sourceUrl: string;
}): QualityScores {
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
    // Seed/generated items with source + explanation meet AO-backed floor
    niveau: hasSource && item.explanation.trim().length > 12 && !looksLikeExamLeak ? 4 : 2,
    language: item.prompt.trim().length > 0 && item.prompt.length < 400 ? 4 : 3,
    safetyFlag,
  };
}

async function liveJudge(
  key: string,
  items: Array<{
    id: string;
    unitId: string;
    prompt: string;
    correct: string | string[];
    explanation: string;
    sourceUrl: string;
  }>,
): Promise<QuestionEval[]> {
  // Structured judge via OpenAI — keep payload small; no PII.
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
            "Du bist Richter für Lernfragen. Verwirf IHK-Originalprüfungen. Antworte als JSON {\"items\":[{\"id\":string,\"sourceFidelity\":0|1,\"uniqueness\":0|1,\"niveau\":1-5,\"language\":1-5,\"safetyFlag\":boolean,\"reasons\":string[]}]}",
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
          sourceFidelity: j.sourceFidelity,
          uniqueness: j.uniqueness,
          niveau: j.niveau,
          language: j.language,
          safetyFlag: j.safetyFlag,
        }
      : heuristicScores(item);
    return {
      questionId: item.id,
      unitId: item.unitId,
      scores,
      passed: scoresPass(scores),
      reasons: j?.reasons ?? [],
    };
  });
}

function flattenSeedQuestions() {
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

/** Run offline calibration of goldset fixture averages (for tests / CLI). */
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
