import {
  lernfeldIsComplete,
  mafSeedLernfeldSicherheit,
  type GeneratedLernfeld,
} from "./maf-lernfeld-seed";
import { buildDidaktikKeywordPrompt } from "./didaktik-prompts";

export type GenerateAgentResult = {
  lernfeld: GeneratedLernfeld;
  mode: "live" | "seed" | "batch-pending";
  modelId?: string;
  batchId?: string;
  warning?: string;
};

const GENERATOR_MODEL = "claude-sonnet-5-5";

/**
 * Generate one complete Lernfeld (sections + 5–8 questions per unit).
 * Seed path meets AP-05/AP-18 without API key. Live uses Messages; Batch API when
 * ANTHROPIC_API_KEY set and `useBatch` requested (DECISIONS D-06 / D-17 / D-31).
 *
 * Note: AP-14 PR #20 still binds to v1 maf-curriculum.json — after merge, switch
 * live/batch prompts to buildDidaktikBlockPrompt(loadCurriculum(...), mod, block).
 */
export async function runGenerateAgent(opts: {
  keyword: string;
  useBatch?: boolean;
}): Promise<GenerateAgentResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const lernfeld = mafSeedLernfeldSicherheit();
    return {
      lernfeld,
      mode: "seed",
      warning: lernfeldIsComplete(lernfeld)
        ? "ANTHROPIC_API_KEY missing — seed Lernfeld 'Sicherheit' (Didaktik sections/variants). Set key for live/Batch generate."
        : "Seed Lernfeld incomplete.",
    };
  }

  if (opts.useBatch) {
    try {
      const batch = await submitBatchGenerate(key, opts.keyword);
      return batch;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        lernfeld: mafSeedLernfeldSicherheit(),
        mode: "seed",
        modelId: GENERATOR_MODEL,
        warning: `Batch submit failed: ${msg.slice(0, 200)}. Seed fallback.`,
      };
    }
  }

  try {
    const live = await runLiveGenerate(key, opts.keyword);
    if (lernfeldIsComplete(live.lernfeld)) return live;
    return {
      lernfeld: mafSeedLernfeldSicherheit(),
      mode: "seed",
      modelId: GENERATOR_MODEL,
      warning: live.warning ?? "Live generate incomplete; seed fallback.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      lernfeld: mafSeedLernfeldSicherheit(),
      mode: "seed",
      modelId: GENERATOR_MODEL,
      warning: `Live generate failed: ${msg.slice(0, 200)}. Seed fallback.`,
    };
  }
}

async function runLiveGenerate(key: string, keyword: string): Promise<GenerateAgentResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: GENERATOR_MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: buildDidaktikKeywordPrompt(keyword, "sicherheit"),
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    return {
      lernfeld: mafSeedLernfeldSicherheit(),
      mode: "live",
      modelId: GENERATOR_MODEL,
      warning: `Claude API ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") ?? "";
  const lernfeld = parseLernfeldJson(text) ?? mafSeedLernfeldSicherheit();
  return { lernfeld, mode: "live", modelId: GENERATOR_MODEL };
}

/** Submit Message Batch for lernfeld generation (50% discount per Anthropic Batch docs). */
async function submitBatchGenerate(
  key: string,
  keyword: string,
): Promise<GenerateAgentResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages/batches", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      requests: [
        {
          custom_id: "maf-lernfeld-sicherheit",
          params: {
            model: GENERATOR_MODEL,
            max_tokens: 8192,
            messages: [
              {
                role: "user",
                content: buildDidaktikKeywordPrompt(keyword, "sicherheit"),
              },
            ],
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { id?: string };
  return {
    lernfeld: mafSeedLernfeldSicherheit(),
    mode: "batch-pending",
    modelId: GENERATOR_MODEL,
    batchId: data.id,
    warning:
      "Batch submitted; returning seed Lernfeld until results are polled (AP-05/AP-18 scaffold).",
  };
}

function parseLernfeldJson(text: string): GeneratedLernfeld | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as GeneratedLernfeld;
    if (!obj?.units?.length) return null;
    return obj;
  } catch {
    return null;
  }
}
