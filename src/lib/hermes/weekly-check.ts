import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SourceCheck = {
  id: string;
  url: string;
  kind: string;
  status: "planned" | "skipped-live";
};

export type HermesDryRun = {
  mode: "dry-run";
  liveBlocked: true;
  reason: string;
  sources: SourceCheck[];
  nextSteps: string[];
};

/**
 * AP-10 scaffold: plan weekly source checks without deploying Hermes.
 * Live Telegram/Railway path stays off until bot + project secrets exist.
 */
export function hermesWeeklyDryRun(): HermesDryRun {
  const path = join(process.cwd(), "docs/research/maf-sources.json");
  let sources: SourceCheck[] = [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      sources?: Array<{ id?: string; url?: string; kind?: string }>;
    };
    sources = (raw.sources ?? []).map((s, i) => ({
      id: s.id ?? `src-${i + 1}`,
      url: s.url ?? "",
      kind: s.kind ?? "unknown",
      status: "skipped-live" as const,
    }));
  } catch {
    sources = [];
  }

  return {
    mode: "dry-run",
    liveBlocked: true,
    reason:
      "Telegram/Hermes deploy secrets absent — scaffold only (RAILWAY_API_TOKEN alone is not enough).",
    sources,
    nextSteps: [
      "Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID on Railway EU",
      "Deploy Hermes with Langfuse plugin when LANGFUSE_* present",
      "Schedule weekly job calling app pipeline API",
    ],
  };
}
