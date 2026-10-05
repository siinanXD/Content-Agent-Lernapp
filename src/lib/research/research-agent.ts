import { generatorModel } from "@/lib/anthropic/client";
import { anthropicHeaders } from "@/lib/anthropic/headers";
import {
  mafSeedSources,
  seedCoversAcceptance,
  type ResearchSource,
} from "./maf-seed-sources";

export type ResearchAgentResult = {
  sources: ResearchSource[];
  mode: "live" | "seed";
  modelId?: string;
  warning?: string;
};

const MAX_TOOL_ROUNDS = 6;

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: string; [key: string]: unknown };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};

/**
 * Research official sources for a course keyword.
 * Live path: Claude Messages API + web_search/web_fetch with tool loop (DECISIONS D-06/D-14).
 * Without ANTHROPIC_API_KEY: verified MAF seed covering AO + RLP + Prüfung.
 */
export async function runResearchAgent(keyword: string): Promise<ResearchAgentResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const sources = mafSeedSources();
    return {
      sources,
      mode: "seed",
      warning: seedCoversAcceptance(sources)
        ? "ANTHROPIC_API_KEY missing — using verified MAF seed (AO/RLP/Prüfung). Set key for live web_search/web_fetch."
        : "ANTHROPIC_API_KEY missing and seed incomplete.",
    };
  }

  try {
    const live = await runLiveResearch(key, keyword);
    if (live.sources.length > 0) return live;
    return {
      sources: mafSeedSources(),
      mode: "seed",
      modelId: generatorModel(),
      warning: live.warning ?? "Live response had no parseable sources; seed fallback.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      sources: mafSeedSources(),
      mode: "seed",
      modelId: generatorModel(),
      warning: `Live research failed: ${msg.slice(0, 200)}. Fell back to seed.`,
    };
  }
}

async function runLiveResearch(
  key: string,
  keyword: string,
): Promise<ResearchAgentResult> {
  const tools = [
    { type: "web_search_20250305", name: "web_search" },
    {
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: 8,
      citations: { enabled: true },
    },
  ];

  const messages: AnthropicMessage[] = [
    {
      role: "user",
      content: `Finde ausschließlich amtliche deutsche Quellen zur Ausbildung "${keyword}":
1) Ausbildungsordnung (Verordnung / gesetze-im-internet / BIBB),
2) Rahmenlehrplan (KMK PDF),
3) Prüfungsanforderungen als Struktur aus der Verordnung (§ Zwischen-/Abschlussprüfung) — KEINE IHK-Originalprüfungsaufgaben und keine Personendaten.

Nutze web_search und web_fetch. Antworte am Ende als JSON-Array von Objekten {title,url,kind} mit kind in ausbildungsordnung|rahmenlehrplan|pruefung|berufsinformation|other. Mindestens je eine Quelle für ausbildungsordnung, rahmenlehrplan und pruefung.`,
    },
  ];

  let lastText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders({
        apiKey: key,
        // web_fetch requires beta header per Anthropic docs
        extra: { "anthropic-beta": "web-fetch-2025-09-10" },
      }),
      body: JSON.stringify({
        model: generatorModel(),
        max_tokens: 4096,
        tools,
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        sources: [],
        mode: "live",
        modelId: generatorModel(),
        warning: `Claude API ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      stop_reason?: string;
      content?: AnthropicContentBlock[];
    };
    const content = data.content ?? [];
    messages.push({ role: "assistant", content });

    lastText = content
      .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");

    const toolUses = content.filter(
      (b): b is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        b.type === "tool_use",
    );

    if (toolUses.length === 0 || data.stop_reason === "end_turn") {
      break;
    }

    // Server-executed tools (web_search / web_fetch) return results inside the
    // assistant content stream on Anthropic's side in many deployments; if we
    // still see tool_use without paired tool_result, ask for the final JSON.
    messages.push({
      role: "user",
      content:
        "Falls die Tools fertig sind: gib jetzt nur das JSON-Array der Quellen aus (kein weiterer Tool-Aufruf nötig, außer eine URL fehlt noch).",
    });
  }

  const sources = parseSourcesJson(lastText);
  if (sources.length === 0) {
    return {
      sources: [],
      mode: "live",
      modelId: generatorModel(),
      warning: "Live response had no parseable sources.",
    };
  }

  const merged = mergeWithSeedIfNeeded(sources, keyword);
  return { sources: merged, mode: "live", modelId: generatorModel() };
}

function mergeWithSeedIfNeeded(sources: ResearchSource[], keyword: string): ResearchSource[] {
  // For MAF pilot, ensure acceptance kinds even if live missed one.
  const isMaf = /maschinen|anlagenf[uü]hrer/i.test(keyword);
  if (!isMaf || seedCoversAcceptance(sources)) return sources;
  const kinds = new Set(sources.map((s) => s.kind));
  const extras = mafSeedSources().filter((s) => !kinds.has(s.kind));
  return [...sources, ...extras];
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
