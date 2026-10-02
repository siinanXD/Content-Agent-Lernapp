import { mafSeedSources, type ResearchSource } from "./maf-seed-sources";

export type ResearchAgentResult = {
  sources: ResearchSource[];
  mode: "live" | "seed";
  modelId?: string;
  warning?: string;
};

/**
 * Research official sources for a course keyword.
 * Live path uses Claude Messages API + web_search/web_fetch (see DECISIONS D-06).
 * Without ANTHROPIC_API_KEY, returns verified seed sources for MAF pilot.
 */
export async function runResearchAgent(keyword: string): Promise<ResearchAgentResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return {
      sources: mafSeedSources(),
      mode: "seed",
      warning:
        "ANTHROPIC_API_KEY missing — seed sources only. Set key for live web_search/web_fetch.",
    };
  }

  // Live call: model ID from official docs (DECISIONS D-06), not memory.
  const modelId = "claude-sonnet-5-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 2048,
      tools: [
        { type: "web_search_20250305", name: "web_search" },
        { type: "web_fetch_20250910", name: "web_fetch" },
      ],
      messages: [
        {
          role: "user",
          content: `Finde ausschließlich amtliche deutsche Quellen zur Ausbildung "${keyword}": Ausbildungsordnung, Rahmenlehrplan, Prüfungsanforderungen. Keine IHK-Originalprüfungsaufgaben. Antworte als JSON-Array von Objekten {title,url,kind} mit kind in ausbildungsordnung|rahmenlehrplan|pruefung|berufsinformation|other.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      sources: mafSeedSources(),
      mode: "seed",
      modelId,
      warning: `Claude API ${res.status}: ${text.slice(0, 200)}. Fell back to seed sources.`,
    };
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") ?? "";
  const sources = parseSourcesJson(text);
  if (sources.length === 0) {
    return {
      sources: mafSeedSources(),
      mode: "seed",
      modelId,
      warning: "Live response had no parseable sources; seed fallback.",
    };
  }
  return { sources, mode: "live", modelId };
}

function parseSourcesJson(text: string): ResearchSource[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]) as Array<{
      title?: string;
      url?: string;
      kind?: ResearchSource["kind"];
    }>;
    const now = new Date().toISOString();
    return arr
      .filter((x) => x.title && x.url?.startsWith("http"))
      .map((x) => ({
        title: x.title!,
        url: x.url!,
        kind: x.kind ?? "other",
        fetchedAt: now,
      }));
  } catch {
    return [];
  }
}
