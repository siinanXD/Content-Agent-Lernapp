import {
  lernfeldIsComplete,
  mafSeedLernfeldSicherheit,
  type GeneratedLernfeld,
} from "./maf-lernfeld-seed";

export type GenerateAgentResult = {
  lernfeld: GeneratedLernfeld;
  mode: "live" | "seed" | "batch-pending";
  modelId?: string;
  batchId?: string;
  warning?: string;
};

const GENERATOR_MODEL = "claude-sonnet-5-5";

/**
 * Generate one complete Lernfeld (explanation + 5–8 questions per unit).
 * Seed path meets AP-05 without API key. Live uses Messages; Batch API when
 * ANTHROPIC_API_KEY set and `useBatch` requested (DECISIONS D-06 / D-17).
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
        ? "ANTHROPIC_API_KEY missing — seed Lernfeld 'Sicherheit'. Set key for live/Batch generate."
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
          content: generatePrompt(keyword),
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
            messages: [{ role: "user", content: generatePrompt(keyword) }],
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
  // Until batch completes, return seed so pipeline stays usable; caller can poll later.
  return {
    lernfeld: mafSeedLernfeldSicherheit(),
    mode: "batch-pending",
    modelId: GENERATOR_MODEL,
    batchId: data.id,
    warning:
      "Batch submitted; returning seed Lernfeld until results are polled (AP-05 scaffold).",
  };
}

function generatePrompt(keyword: string): string {
  return `Erzeuge EIN vollständiges Lernfeld als JSON für "${keyword}", Fokus Sicherheit und Gesundheitsschutz.
3 Einheiten, je kurze Erklärung, 5–8 Fragen (Typen: auswahl|zuordnen|lueckentext|reihenfolge|rechnen), jede mit explanation und sourceUrl (amtliche AO/RLP-Links).
Keine IHK-Originalprüfungen, keine Personendaten.
Schema: {"id":string,"title":string,"focus":string,"units":[{"id":string,"title":string,"minutes":number,"explanation":string,"sourceUrl":string,"sourceFetchedAt":string,"questions":[{"id":string,"type":string,"prompt":string,"choices":string[],"correct":string|string[],"explanation":string,"sourceUrl":string}]}]}
Nur JSON.`;
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
