import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAllCurricula, type Curriculum } from "../content/curriculum";
import {
  affectedModules,
  collectSources,
  type DiffResult,
  type SourceLock,
} from "../content/source-watch";

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

export type AffectedMap = {
  mapId: string;
  mapTitle: string;
  sourceIds: string[];
  modules: Array<{ moduleId: string; blockIds: string[] }>;
};

export type RefreshTarget = {
  /** Curriculum map id — Hermes resolves the matching course before calling refresh. */
  mapId: string;
  sourceIds: string[];
  moduleIds: string[];
  blockIds: string[];
};

export type SourceCheckReportLike = {
  checkedAt?: string;
  diff?: DiffResult | null;
  feedHits?: Array<{ feed?: string; title?: string; keyword?: string; error?: string }>;
  affected?: Array<{ mapId: string; sourceId: string; modules: Array<{ moduleId: string; blockIds: string[] }> }>;
};

export type WeeklyAlertPlan = {
  changedMapIds: string[];
  linearIssues: Array<{ mapId: string; title: string; body: string }>;
  mapStatusUpdates: Array<{ mapId: string; status: "Prüfung nötig"; file: string }>;
  refreshTargets: RefreshTarget[];
  telegramText: string;
};

export type WeeklyAlertResult = {
  plan: WeeklyAlertPlan;
  telegram: { attempted: boolean; sent: boolean; skippedReason?: string };
  linear: Array<{ mapId: string; title: string; created: boolean; skippedReason?: string; url?: string }>;
  mapStatus: Array<{ mapId: string; written: boolean; status: "Prüfung nötig"; skippedReason?: string }>;
};

const MAP_STATUS_REVIEW = "Prüfung nötig" as const;
const CONTENT_DIR = join(process.cwd(), "docs/content");

function loadLock(lockPath: string): SourceLock | null {
  try {
    return JSON.parse(readFileSync(lockPath, "utf8")) as SourceLock;
  } catch {
    return null;
  }
}

/**
 * AP-10 scaffold: plan the weekly source check without deploying Hermes.
 * Sources come from the curriculum maps (AP-13) and the version markers from
 * the lock (AP-16); the live comparison runs in scripts/content-check-sources.mjs
 * on Railway, never in the Cloud-Agent sandbox (domains blocked).
 */
export function hermesWeeklyDryRun(): HermesDryRun {
  const lockPath = join(process.cwd(), "docs/content/sources.lock.json");
  const lock = loadLock(lockPath);

  const collected = collectSources(loadAllCurricula());
  const sources: SourceCheck[] = Object.values(collected).map((s) => ({
    id: s.sourceIds[0] ?? s.url,
    url: s.url,
    kind: s.kind,
    mapIds: s.mapIds,
    standLabel: lock?.entries[s.url]?.standLabel ?? null,
    status: "skipped-live" as const,
  }));
  const sourcesMissingInLock = lock
    ? sources.filter((s) => !lock.entries[s.url]).map((s) => s.url)
    : sources.map((s) => s.url);

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
      "Optional: LINEAR_API_KEY (+ LINEAR_TEAM_ID) for auto issues „Quelle geändert: <Map>“",
      "Weekly: npm run content:check-sources (exit 2 = source changed or feed hit, exit 3 = lock incomplete)",
      "On exit 2: npm run hermes:weekly — Telegram + Linear + Map-Status „Prüfung nötig“ + selective refresh targets",
      "Deploy Hermes with Langfuse plugin when LANGFUSE_* present",
    ],
  };
}

/** Group script `affected` rows and diff mapIds into per-map refresh targets. */
export function affectedMapsFromReport(
  report: SourceCheckReportLike,
  curricula: Curriculum[] = loadAllCurricula(),
): AffectedMap[] {
  const byMap = new Map<string, AffectedMap>();
  const ensure = (mapId: string): AffectedMap => {
    let row = byMap.get(mapId);
    if (!row) {
      const c = curricula.find((x) => x.id === mapId);
      row = { mapId, mapTitle: c?.title ?? mapId, sourceIds: [], modules: [] };
      byMap.set(mapId, row);
    }
    return row;
  };

  for (const a of report.affected ?? []) {
    const row = ensure(a.mapId);
    if (!row.sourceIds.includes(a.sourceId)) row.sourceIds.push(a.sourceId);
    for (const m of a.modules) {
      const existing = row.modules.find((x) => x.moduleId === m.moduleId);
      if (existing) {
        for (const b of m.blockIds) if (!existing.blockIds.includes(b)) existing.blockIds.push(b);
      } else {
        row.modules.push({ moduleId: m.moduleId, blockIds: [...m.blockIds] });
      }
    }
  }

  // Feed hits or standLabel changes may list mapIds without a precomputed `affected` row.
  for (const ch of report.diff?.changed ?? []) {
    for (const mapId of ch.mapIds) {
      const row = ensure(mapId);
      const c = curricula.find((x) => x.id === mapId);
      const lock = loadLock(join(process.cwd(), "docs/content/sources.lock.json"));
      const sourceIds = lock?.entries[ch.url]?.sourceIds ?? [];
      for (const sid of sourceIds) {
        if (!row.sourceIds.includes(sid)) row.sourceIds.push(sid);
        if (c) {
          for (const m of affectedModules(c, sid)) {
            const existing = row.modules.find((x) => x.moduleId === m.moduleId);
            if (existing) {
              for (const b of m.blockIds) if (!existing.blockIds.includes(b)) existing.blockIds.push(b);
            } else {
              row.modules.push({ moduleId: m.moduleId, blockIds: [...m.blockIds] });
            }
          }
        }
      }
    }
  }

  return [...byMap.values()].sort((a, b) => a.mapId.localeCompare(b.mapId));
}

export function refreshTargetsFromAffected(maps: AffectedMap[]): RefreshTarget[] {
  return maps.map((m) => ({
    mapId: m.mapId,
    sourceIds: [...m.sourceIds],
    moduleIds: m.modules.map((x) => x.moduleId),
    blockIds: m.modules.flatMap((x) => x.blockIds),
  }));
}

/** Pure plan: Linear titles, Telegram text, map status, selective refresh body. */
export function planWeeklyAlerts(
  report: SourceCheckReportLike,
  curricula: Curriculum[] = loadAllCurricula(),
): WeeklyAlertPlan {
  const maps = affectedMapsFromReport(report, curricula);
  const feedHits = (report.feedHits ?? []).filter((h) => !h.error);
  const changed = report.diff?.changed ?? [];
  const unreachable = report.diff?.unreachable ?? [];

  // Feed hits without a map-specific URL still open a review on every map whose keyword matched.
  if (feedHits.length && maps.length === 0) {
    for (const c of curricula) {
      const hit = feedHits.find((h) =>
        (h.keyword ?? "").toLowerCase().includes(c.keyword.toLowerCase().slice(0, 12)) ||
        c.keyword.toLowerCase().includes((h.keyword ?? "").toLowerCase().slice(0, 12)),
      );
      if (hit) maps.push({ mapId: c.id, mapTitle: c.title, sourceIds: [], modules: [] });
    }
  }

  const linearIssues = maps.map((m) => {
    const changedLines = changed
      .filter((c) => c.mapIds.includes(m.mapId))
      .map((c) => `- ${c.field}: ${c.url}\n  vorher: \`${c.before}\`\n  nachher: \`${c.after}\``);
    const moduleLines = m.modules.length
      ? m.modules.map((mod) => `- \`${mod.moduleId}\`: ${mod.blockIds.join(", ") || "alle Blöcke"}`)
      : ["- noch nicht eingegrenzt — komplette Map prüfen"];
    const lines = [
      `Automatischer Quellen-Monitor (AP-16 / Hermes).`,
      ``,
      `Map: **${m.mapTitle}** (\`${m.mapId}\`)`,
      `Geprüft: ${report.checkedAt ?? "n/a"}`,
      ``,
      `### Geänderte Quellen`,
      ...(changedLines.length ? changedLines : ["- (siehe Feed-Treffer / Report)"]),
      ``,
      `### Betroffene Module / Blöcke (für POST /courses/{id}/refresh)`,
      ...moduleLines,
      ``,
      `Nächster Schritt: Map anpassen, Lock mit \`--update\` schreiben, dann selektiv refresh.`,
    ];
    return {
      mapId: m.mapId,
      title: `Quelle geändert: ${m.mapId}`,
      body: lines.join("\n"),
    };
  });

  const telegramLines = [
    `Quellen-Monitor: ${maps.length} Map(s) prüfen`,
    ...changed.slice(0, 5).map((c) => `• ${c.field} ${c.url} → ${c.after}`),
    ...unreachable.slice(0, 3).map((u) => `• unreachable ${u.url} (${u.httpStatus ?? u.error ?? "?"})`),
    ...feedHits.slice(0, 3).map((h) => `• feed ${h.feed}: ${h.title}`),
    ...maps.map((m) => `• Linear: Quelle geändert: ${m.mapId}`),
  ];

  return {
    changedMapIds: maps.map((m) => m.mapId),
    linearIssues,
    mapStatusUpdates: maps.map((m) => ({
      mapId: m.mapId,
      status: MAP_STATUS_REVIEW,
      file: join(CONTENT_DIR, `${m.mapId}.json`),
    })),
    refreshTargets: refreshTargetsFromAffected(maps),
    telegramText: telegramLines.join("\n"),
  };
}

function mapFilePath(mapId: string): string {
  return join(CONTENT_DIR, `${mapId}.json`);
}

/** Set curriculum JSON `status` to „Prüfung nötig“. No-op if file missing. */
export function markMapPruefungNoetig(mapId: string, write = true): { written: boolean; skippedReason?: string } {
  const file = mapFilePath(mapId);
  try {
    const raw = readFileSync(file, "utf8");
    const data = JSON.parse(raw) as Curriculum & { status?: string };
    if (data.status === MAP_STATUS_REVIEW) return { written: false, skippedReason: "already-set" };
    data.status = MAP_STATUS_REVIEW;
    if (write) writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    return { written: write };
  } catch (err) {
    return { written: false, skippedReason: err instanceof Error ? err.message : String(err) };
  }
}

type FetchLike = typeof fetch;

type EnvMap = Record<string, string | undefined>;

/** Soft Telegram send — never throws; skips when secrets absent. */
export async function sendTelegramAlert(
  text: string,
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ attempted: boolean; sent: boolean; skippedReason?: string }> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return { attempted: false, sent: false, skippedReason: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID absent" };
  }
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3900), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { attempted: true, sent: false, skippedReason: `telegram HTTP ${res.status}` };
    }
    return { attempted: true, sent: true };
  } catch (err) {
    return { attempted: true, sent: false, skippedReason: err instanceof Error ? err.message : String(err) };
  }
}

/** Soft Linear issue create — never throws; skips when LINEAR_API_KEY absent. */
export async function createLinearSourceIssue(
  issue: { title: string; body: string },
  env: EnvMap = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ created: boolean; skippedReason?: string; url?: string }> {
  const key = env.LINEAR_API_KEY?.trim();
  const teamId = env.LINEAR_TEAM_ID?.trim();
  if (!key) return { created: false, skippedReason: "LINEAR_API_KEY absent" };
  if (!teamId) return { created: false, skippedReason: "LINEAR_TEAM_ID absent" };
  try {
    const res = await fetchImpl("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: key,
      },
      body: JSON.stringify({
        query: `mutation($input: IssueCreateInput!) {\n          issueCreate(input: $input) { success issue { id url } }\n        }`,
        variables: {
          input: {
            teamId,
            title: issue.title,
            description: issue.body,
            ...(env.LINEAR_PROJECT_ID?.trim() ? { projectId: env.LINEAR_PROJECT_ID.trim() } : {}),
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { created: false, skippedReason: `linear HTTP ${res.status}` };
    const json = (await res.json()) as {
      data?: { issueCreate?: { success?: boolean; issue?: { url?: string } } };
      errors?: Array<{ message?: string }>;
    };
    if (json.errors?.length) {
      return { created: false, skippedReason: json.errors[0]?.message ?? "linear graphql error" };
    }
    if (!json.data?.issueCreate?.success) {
      return { created: false, skippedReason: "linear issueCreate unsuccessful" };
    }
    return { created: true, url: json.data.issueCreate.issue?.url };
  } catch (err) {
    return { created: false, skippedReason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Apply alert side-effects for a source-check report.
 * Telegram / Linear secrets may be absent — wire the calls, never fail the package.
 */
export async function applyWeeklyAlerts(
  report: SourceCheckReportLike,
  opts: {
    writeMapStatus?: boolean;
    notify?: boolean;
    env?: EnvMap;
    fetchImpl?: FetchLike;
    curricula?: Curriculum[];
  } = {},
): Promise<WeeklyAlertResult> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const writeMapStatus = opts.writeMapStatus ?? false;
  const notify = opts.notify ?? true;
  const plan = planWeeklyAlerts(report, opts.curricula ?? loadAllCurricula());

  const telegram =
    notify && plan.changedMapIds.length
      ? await sendTelegramAlert(plan.telegramText, env, fetchImpl)
      : { attempted: false, sent: false, skippedReason: plan.changedMapIds.length ? "notify=false" : "no-changes" };

  const linear: WeeklyAlertResult["linear"] = [];
  for (const issue of plan.linearIssues) {
    if (!notify) {
      linear.push({ mapId: issue.mapId, title: issue.title, created: false, skippedReason: "notify=false" });
      continue;
    }
    const res = await createLinearSourceIssue(issue, env, fetchImpl);
    linear.push({ mapId: issue.mapId, title: issue.title, ...res });
  }

  const mapStatus: WeeklyAlertResult["mapStatus"] = [];
  for (const u of plan.mapStatusUpdates) {
    const res = markMapPruefungNoetig(u.mapId, writeMapStatus);
    mapStatus.push({ mapId: u.mapId, status: MAP_STATUS_REVIEW, written: res.written, skippedReason: res.skippedReason });
  }

  return { plan, telegram, linear, mapStatus };
}

/** Body shape for selective POST /courses/{id}/refresh. */
export function refreshRequestBody(target: RefreshTarget): {
  mapId: string;
  sourceIds: string[];
  moduleIds: string[];
  blockIds: string[];
} {
  return {
    mapId: target.mapId,
    sourceIds: target.sourceIds,
    moduleIds: target.moduleIds,
    blockIds: target.blockIds,
  };
}
