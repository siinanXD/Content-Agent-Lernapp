/**
 * Free-Tier-Wächter des Planers (SIN-225, Rest aus SIN-223 3b).
 * Reine Funktionen: Limit-Prüfung (ab 80 %), Linear-Issue je Limit, Wochenbericht.
 * Verbrauch kommt aus `collectUsage` (status.mjs), Limits aus docs/autonomy/free-tier-limits.json.
 */
import { readFileSync } from "node:fs";
import { buildQuotaRows, collectUsage, gh } from "./status.mjs";
import { linearTeamAndProject, stateIdByName, linear } from "./linear.mjs";

export const LIMITS_FILE = new URL("../../docs/autonomy/free-tier-limits.json", import.meta.url);
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const ISSUE_PREFIX = "Free-Tier:";

export const readLimits = () => JSON.parse(readFileSync(LIMITS_FILE, "utf8"));

/** Kontingente mit gemessenem Verbrauch ab der Warnschwelle (Standard 80 %, „erreicht“ = ≥). */
export function limitAlerts(usage, limitsFile) {
  const warn = limitsFile.warnschwelle_prozent ?? 80;
  return buildQuotaRows(usage, limitsFile).filter((r) => r.pct != null && r.pct >= warn);
}

/** Titel enthält nur den Namen, nicht den Prozentwert: ein offenes Issue je Limit, keine Dubletten. */
export function limitIssue(row) {
  return {
    lane: "backend",
    priority: 2,
    labels: ["backend"],
    title: `${ISSUE_PREFIX} ${row.name} nahe am Limit`,
    description: `${row.name}: ${row.text} von ${row.limit} ${row.unit} (${row.pct} %). Schwelle 80 %.\n\nLimits und Quellen: docs/autonomy/free-tier-limits.json, docs/decisions/SIN-225-free-tier-waechter.md.\n\n## Akzeptanzkriterien\n- [ ] Verbrauch gesenkt oder Limit bewusst akzeptiert (Entscheidungsdatei)`,
  };
}

/** Neue Issues für die Warnungen; schon offene (Titel gleich) entfallen. */
export function newLimitIssues(alerts, existingTitles = []) {
  const taken = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  return alerts.map(limitIssue).filter((i) => !taken.has(i.title.toLowerCase()));
}

/**
 * Wochenbericht aus den Läufen der letzten 7 Tage.
 * `runs`: [{ name, created_at, conclusion }]; `limitAborts`: Anzahl Worker-Läufe, die wegen Limit pausierten;
 * `prs`: [{ merged_at }]. Läufe: Worker (gestartet durch den Dispatcher).
 */
/** @param {{ runs?: { name?: string, created_at?: string }[], prs?: { merged_at?: string | null }[], limitAborts?: number | null, now?: Date }} opts */
export function weeklyReport({ runs = [], prs = [], limitAborts = null, now = new Date() }) {
  const since = now.getTime() - WEEK_MS;
  const recent = (iso) => iso && new Date(iso).getTime() >= since;
  const started = runs.filter((r) => r.name === "worker" && recent(r.created_at)).length;
  const merged = prs.filter((p) => recent(p.merged_at)).length;
  return {
    gestartet: started,
    abgebrochen_limit: limitAborts,
    gemergt: merged,
  };
}

/** @param {{ gestartet: number, abgebrochen_limit: number | null, gemergt: number }} r */
export function renderWeeklyReport(r) {
  return [
    "## Wochenbericht (7 Tage)",
    `- Gestartete Läufe (worker): ${r.gestartet}`,
    `- Abgebrochen wegen Limit: ${r.abgebrochen_limit ?? "nicht verfügbar"}`,
    `- Gemergte PRs: ${r.gemergt}`,
  ].join("\n");
}

/** Anzahl Worker-Läufe, in denen der Schritt „Pause bis Reset setzen“ lief (= echtes Claude-Limit). */
export async function countLimitAborts(repo, runs, call) {
  let n = 0;
  for (const r of runs.filter((x) => x.name === "worker")) {
    const { jobs } = await call(`/repos/${repo}/actions/runs/${r.id}/jobs?per_page=20`);
    if (jobs.some((j) => j.steps?.some((s) => s.name === "Pause bis Reset setzen" && s.conclusion === "success"))) n += 1;
  }
  return n;
}

/** Legt die Issues an (Todo, Label Spur). Ohne Linear-Zugang nur Ausgabe. */
export async function createLimitIssues(items, call = linear) {
  const { teamId, projectId } = await linearTeamAndProject(call);
  const stateId = await stateIdByName(teamId, "Todo", call);
  for (const it of items) {
    const found = await call(`query($t: ID!, $n: String!) { issueLabels(filter: { team: { id: { eq: $t } }, name: { eqIgnoreCase: $n } }) { nodes { id } } }`, { t: teamId, n: "backend" });
    const labelIds = found.issueLabels.nodes.map((l) => l.id);
    const data = await call(`mutation($i: IssueCreateInput!) { issueCreate(input: $i) { issue { identifier url } } }`, {
      i: { teamId, projectId, stateId, title: it.title, description: it.description, priority: it.priority, labelIds },
    });
    console.log(`Angelegt: ${data.issueCreate.issue.identifier} ${data.issueCreate.issue.url}`);
  }
}

/** Läufe und gemergte PRs der letzten 7 Tage aus GitHub. */
export async function collectWeek(repo, now = new Date(), call = gh) {
  const since = new Date(now.getTime() - WEEK_MS).toISOString().slice(0, 10);
  const { workflow_runs } = await call(`/repos/${repo}/actions/runs?per_page=100&created=>=${since}`);
  const prs = await call(`/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`);
  return { runs: workflow_runs, prs: prs.filter((p) => p.merged_at) };
}

/**
 * Limit-Prüfung und Wochenbericht für den Planer. Ohne Zugang steht „nicht messbar“ da (kein Abbruch).
 * Dry-Run (oder ohne LINEAR_API_KEY): nur ausgeben, nichts in Linear anlegen.
 * @returns {Promise<string>} Markdown für die Step-Summary
 */
export async function runLimitCheck({ env = process.env, dry = false, existingTitles = [], now = new Date(), call = linear } = {}) {
  const limitsFile = readLimits();
  const repo = env.GITHUB_REPOSITORY;
  let week = { runs: [], prs: [] };
  let limitAborts = null;
  if (repo && env.GITHUB_TOKEN) {
    try {
      week = await collectWeek(repo, now);
      limitAborts = await countLimitAborts(repo, week.runs, gh);
    } catch (e) {
      console.log(`GitHub nicht lesbar: ${e.message}`);
    }
  }
  const usage = await collectUsage({ env, now, runs: week.runs });
  const rows = buildQuotaRows(usage, limitsFile);
  const alerts = limitAlerts(usage, limitsFile);
  const items = newLimitIssues(alerts, existingTitles);
  const write = !dry && Boolean(env.LINEAR_API_KEY);
  const lines = [
    `## Free-Tier-Prüfung (Schwelle ${limitsFile.warnschwelle_prozent ?? 80} %)`,
    ...rows.map((r) => `- ${r.name}: ${r.text}${r.pct == null ? "" : ` (${r.pct} % von ${r.limit} ${r.unit})`}`),
    alerts.length ? `\nBei der Schwelle: ${alerts.map((a) => a.name).join(", ")}` : "\nKein Limit bei der Schwelle.",
    ...(write ? [] : items.map((it) => `[dry-run] ${it.lane} P${it.priority} ${it.title}`)),
    "",
    renderWeeklyReport(weeklyReport({ runs: week.runs, prs: week.prs, limitAborts, now })),
  ];
  if (write) await createLimitIssues(items, call);
  return lines.join("\n");
}
