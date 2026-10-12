/**
 * SIN-437: Claude als zweiter Richter (normale Messages-Aufrufe, kein Batch). Gleicher Prompt und gleiche
 * Skalen wie der OpenAI-Richter (`JUDGE_SYSTEM_PROMPT`); die Auswertung teilt `judgeQuestionsFromText`.
 */
import { anthropicFetch } from "@/lib/anthropic/client";
import { compactApiError } from "@/lib/api-error";
import { withSourceExcerpts } from "./source-excerpt";
import {
  JUDGE_SYSTEM_PROMPT,
  judgeChunked,
  judgeQuestionsFromText,
  judgeUserContent,
  type EvalItem,
  type JudgeChunkResult,
} from "./evaluate-agent";
import type { QuestionEval } from "./schemas";

/** Günstigster Claude, der die Richter-Aufgabe trägt (Standard-Preis = 2× Batch laut cost-guard). */
export const CLAUDE_JUDGE_MODEL = "claude-haiku-5-5";

export async function claudeJudgeChunk(
  items: EvalItem[],
  model = CLAUDE_JUDGE_MODEL,
  fetchImpl?: (path: string, init: { method: string; body: string }) => Promise<Response>,
): Promise<JudgeChunkResult> {
  const send = fetchImpl ?? anthropicFetch;
  const res = await send("/v1/messages", {
    method: "POST",
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: judgeUserContent(items) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status} (${model}): ${compactApiError(await res.text().catch(() => ""))}`);
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
  return {
    questions: judgeQuestionsFromText(text, items),
    usage: { prompt_tokens: data.usage?.input_tokens ?? 0, completion_tokens: data.usage?.output_tokens ?? 0 },
  };
}

export async function claudeJudge(
  items: EvalItem[],
): Promise<{ questions: QuestionEval[]; usage: { prompt_tokens: number; completion_tokens: number } }> {
  // SIN-456: gleicher Quellenauszug wie beim OpenAI-Richter.
  return judgeChunked(await withSourceExcerpts(items), (chunk) => claudeJudgeChunk(chunk));
}
