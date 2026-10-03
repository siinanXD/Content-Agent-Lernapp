import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadAllCurricula } from "../content/curriculum";
import { collectSources, type SourceLock } from "../content/source-watch";

export type SourceCheck = {
  id: string;
  url: string;
  kind: string;
  /** Maps (docs/content/*.json) that cite this source. */
  mapIds: string[];
  /** Version marker from docs/content/sources.lock.json, if seeded. */
  standLabel: string | null;
  status: "planned" | "skipped-live";
};

export type HermesDryRun = {
  mode: "dry-run";
  liveBlocked: true;
  reason: string;
  lockPath: string;
  sourcesMissingInLock: string[];
  watchKeywords: string[];
  feeds: SourceLock["feeds"];
  sources: SourceCheck[];
  nextSteps: string[];
};

/**
 * AP-10 scaffold: plan the weekly source check without deploying Hermes.
 * Sources come from the curriculum maps (AP-13) and the version markers from
 * the lock (AP-16); the live comparison runs in scripts/content-check-sources.mjs
 * on Railway, never in the Cloud-Agent sandbox (domains blocked).
 */
export function hermesWeeklyDryRun(): HermesDryRun {
  const lockPath = join(process.cwd(), "docs/content/sources.lock.json");
  let lock: SourceLock | null = null;
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8")) as SourceLock;
  } catch {
    lock = null;
  }

  const collected = collectSources(loadAllCurricula());
  const sources: SourceCheck[] = Object.values(collected).map((s) => ({
    id: s.sourceIds[0] ?? s.url,
    url: s.url,
    kind: s.kind,
    mapIds: s.mapIds,
    standLabel: lock?.entries[s.url]?.standLabel ?? null,
    status: "skipped-live" as const,
  }));
  const sourcesMissingInLock = lock ? sources.filter((s) => !lock!.entries[s.url]).map((s) => s.url) : sources.map((s) => s.url);

  return {
    mode: "dry-run",
    liveBlocked: true,
    reason:
      "Telegram/Hermes deploy secrets absent — scaffold only (RAILWAY_API_TOKEN alone is not enough).",
    lockPath,
    sourcesMissingInLock,
    watchKeywords: lock?.watchKeywords ?? [],
    feeds: lock?.feeds ?? [],
    sources,
    nextSteps: [
      "Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID on Railway EU",
      "Weekly: npm run content:check-sources (exit 2 = source changed or feed hit, exit 3 = lock incomplete)",
      "On exit 2: Telegram report with changed sources and affected modules, then re-run the pipeline for those blocks",
      "Deploy Hermes with Langfuse plugin when LANGFUSE_* present",
    ],
  };
}
