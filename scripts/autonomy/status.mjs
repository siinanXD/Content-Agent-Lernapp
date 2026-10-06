#!/usr/bin/env node
/**
 * Loop-Status und Wächter (SIN-238).
 *
 *   node scripts/autonomy/status.mjs [--dry-run] [--fixture datei.json]
 *
 * Schreibt den Text des angepinnten GitHub-Issues „Loop-Status“ neu (Label `loop-status`, kein Kommentar-Spam)
 * und meldet Probleme einmal pro Vorfall per Kommentar mit @siinanXD (Push über GitHub Mobile).
 * Der Merker „schon gemeldet“ steht als HTML-Kommentar im Issue-Text. Selbstheilung: Merge-Konflikt → @claude
 * im PR, „In Progress“ mit gemergtem PR → Done. Ausgabe für Actions: GITHUB_OUTPUT `kick` (Dispatcher anstoßen).
 * Alles Auswerten ist reine Funktion (`analyze`); nur `collect*` und `main` sprechen mit dem Netz.
 * Dry-Run: nur lesen und ausgeben. Ohne Netz: `--fixture` (siehe docs/autonomy/fixture-status.json).
 */
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { claudeMayTake, isPaused, parsePausedUntil } from "./budget.mjs";
import { fetchJson } from "./http.mjs";
import { planDeploy, renderDeploy, triggerDeploy } from "./deploy.mjs";
import { decideRefill, nextRefillAt, overQuota, refillConfig } from "./refill.mjs";
import { lastPlanAt, phaseAllowsIssue, phaseState, renderPhase } from "./phase.mjs";
import {
  MAX_PARALLEL,
  linear,
  comment,
  fetchProjectIssues,
  hasOpenBlockers,
  isHumanIssue,
  laneOf,
  prMentions,
  reconcile,
  setState,
  startOrder,
} from "./linear.mjs";

export const MENTION = "@siinanXD";
export const STATUS_LABEL = "loop-status";
export const STATUS_TITLE = "Loop-Status";
export const IDLE_MIN = 45;
export const STUCK_MIN = 60;
export const APPROVAL_MIN = 120;
export const KICK_MIN = 10;
/** So lange wartet der Wächter nach einer @claude-Bitte, bevor er sie wiederholt oder an Sinan eskaliert. */
export const CLAUDE_RETRY_MIN = 45;
export const MAX_CLAUDE_ASKS = 2;
const APPROVAL_LABELS = ["freigegeben", "owner-approved"];
const STATE_RE = /<!-- loop-status-state: (\{.*?\}) -->/s;
const RUNNING = ["in_progress", "queued", "waiting", "pending", "requested"];
const DAY_MS = 24 * 60 * 60 * 1000;

const mins = (iso, now) => (iso ? (now.getTime() - new Date(iso).getTime()) / 60000 : Infinity);
const hm = (m) => (m < 90 ? `${Math.round(m)} Min` : `${Math.round(m / 6) / 10} h`);
const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const idOf = (text) => String(text ?? "").match(/SIN-\d+/)?.[0] ?? null;
const labelNames = (pr) => (pr.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
const isAgentPr = (pr) => /^(claude|cursor)\//.test(pr.head ?? "");

/** Prozent eines Werts gegen sein Limit; null, wenn eins von beiden fehlt. */
export const percent = (value, limit) =>
  typeof value === "number" && typeof limit === "number" && limit > 0 ? Math.round((value / limit) * 1000) / 10 : null;

const QUOTAS = [
  ["github_actions_minuten", "GitHub Actions: Minuten"],
  ["github_actions_laeufe_tag", "GitHub Actions: Läufe heute"],
  ["vercel_deployments_tag", "Vercel Hobby: Deployments heute"],
  ["vercel_build_minuten", "Vercel Hobby: Build-Minuten"],
  ["supabase_db_mb", "Supabase Free: DB-Größe"],
  ["supabase_projekte", "Supabase Free: aktive Projekte"],
  ["sentry_events_monat", "Sentry: Fehler im Monat"],
  ["posthog_events_monat", "PostHog: Events im Monat"],
  ["langfuse_units_monat", "Langfuse: Units im Monat"],
  ["claude_max", "Claude Max"],
  ["api_kosten_eur", "Anthropic/OpenAI API: Kosten (Ledger)"],
];

/**
 * Kontingent-Zeilen. `usage[key]`: Zahl (gemessen), `{ text }` (Anzeige ohne Prozent, z. B. Claude Max)
 * oder `{ error }` / fehlend = „nicht messbar“. Limits aus docs/autonomy/free-tier-limits.json.
 */
export function buildQuotaRows(usage = {}, limitsFile = {}) {
  const limits = limitsFile.limits ?? {};
  const warn = limitsFile.warnschwelle_prozent ?? 80;
  return QUOTAS.map(([key, name]) => {
    const u = usage[key];
    const lim = limits[key];
    const limit = lim?.limit ?? null;
    const row = { key, name, value: null, limit, unit: lim?.einheit ?? "", pct: null, text: "", over: false };
    if (typeof u === "number") {
      row.value = u;
      row.pct = percent(u, limit);
      row.text = `${u}${lim?.einheit ? ` ${lim.einheit}` : ""}`;
    } else if (u?.text) row.text = u.text;
    else row.text = `nicht messbar${u?.error ? ` (${u.error})` : ""}`;
    row.over = row.pct != null && row.pct >= warn; // ab 80 % (SIN-251, wie der Wächter SIN-225)
    return row;
  });
}

function renderQuotaTable(rows) {
  const lines = ["| Kontingent | Verbrauch | Limit | Anteil |", "| --- | --- | --- | --- |"];
  for (const r of rows) {
    const limit = r.limit == null ? "–" : `${r.limit} ${r.unit}`;
    const pct = r.pct == null ? "–" : `${r.pct} %${r.over ? " ⚠️" : ""}`;
    lines.push(`| ${cell(r.name)} | ${cell(r.text)} | ${cell(limit)} | ${pct} |`);
  }
  return lines.join("\n");
}

/**
 * Wertet einen Schnappschuss aus und liefert Issue-Text, neue Vorfälle, Selbstheilungs-Aktionen und den neuen Merker.
 * @param {object} snap { now, runs, prs, issues, paused, usage, failures, checks }
 *   runs: [{ id, name, display_title, status, conclusion, created_at, updated_at, html_url }]
 *   prs: [{ number, title, head, draft, state, merged_at, mergeable_state, labels, created_at, updated_at, html_url }]
 *   failures: { [runId]: "Fehlerzeile" }; checks: { [prNumber]: { mergeGate: "failure"|"success"|... } }
 * @param {object} limitsFile
 * @param {{ reported?: string[], conflictAsks?: Record<string, string[]> }} prev Merker aus dem letzten Issue-Text
 */
export function analyze(snap, limitsFile = {}, prev = {}) {
  const now = new Date(snap.now ?? Date.now());
  const runs = snap.runs ?? [];
  const prs = snap.prs ?? [];
  const issues = snap.issues ?? [];
  const failures = snap.failures ?? {};
  const checks = snap.checks ?? {};
  const paused = isPaused(snap.paused, now);
  const pausedUntil = parsePausedUntil(snap.paused)?.toISOString();
  const since = (iso) => now.getTime() - new Date(iso).getTime() <= DAY_MS;

  const workers = runs.filter((r) => r.name === "worker");
  const running = workers.filter((r) => RUNNING.includes(r.status));
  const failed = workers.filter((r) => r.conclusion === "failure" && since(r.created_at));
  const openPrs = prs.filter((p) => p.state === "open");
  const mergedPrs = prs.filter((p) => p.merged_at && since(p.merged_at));
  const prLite = openPrs.map((p) => ({ title: p.title, head: p.head }));
  // Phase (SIN-244): im Betrieb startet der Dispatcher nur bug, security, content und den Wochenplan.
  const phase = phaseState({ ...snap.phaseEnv, now });
  const mayTake = (i) => phaseAllowsIssue(phase.phase, i) && claudeMayTake(i, { now, openPrs: prLite });
  const order = startOrder(issues, mayTake);
  const started = issues.filter((i) => i.state?.type === "started");
  const todo = issues.filter((i) => i.state?.name === "Todo");

  const needsApproval = (p) => labelNames(p).includes("risk:high") && !APPROVAL_LABELS.some((l) => labelNames(p).includes(l));
  const riskOf = (p) => labelNames(p).find((l) => l.startsWith("risk:")) ?? "risk:?";

  // --- Wächter ---
  /** @type {{ key: string, text: string }[]} */
  const incidents = [];
  const actions = [];
  for (const r of failed) {
    const id = idOf(r.display_title) ?? "?";
    incidents.push({
      key: `worker-failed:${r.id}`,
      text: `Worker ${id} fehlgeschlagen: ${failures[r.id] || "kein Fehlertext lesbar"} ([Lauf](${r.html_url}))`,
    });
  }
  const startable = order.length > 0 && started.length < MAX_PARALLEL;
  const lastWorkerEnd = workers.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), "");
  const idleSince = [lastWorkerEnd, ...order.map((i) => i.updatedAt)].filter(Boolean).sort().pop();
  if (!running.length && startable && !paused && mins(idleSince, now) > IDLE_MIN) {
    incidents.push({ key: "idle", text: `Kein Worker läuft seit ${hm(mins(idleSince, now))}, obwohl ${order.length} startbare Todo-Issues da sind (nächstes: ${order[0].identifier}).` });
  }
  for (const i of started) {
    const hasWorker = running.some((r) => idOf(r.display_title) === i.identifier);
    const hasPr = prs.some((p) => p.state === "open" && prMentions(p, i.identifier));
    if (!hasWorker && !hasPr && mins(i.updatedAt, now) > STUCK_MIN && !prs.some((p) => p.merged_at && prMentions(p, i.identifier))) {
      incidents.push({ key: `stuck:${i.identifier}`, text: `${i.identifier} steht auf „In Progress“ ohne laufenden Worker und ohne offenen PR seit ${hm(mins(i.updatedAt, now))}.` });
    }
  }
  for (const p of openPrs.filter(needsApproval)) {
    if (mins(p.updated_at ?? p.created_at, now) > APPROVAL_MIN) {
      incidents.push({ key: `approval:${p.number}`, text: `PR #${p.number} wartet seit ${hm(mins(p.updated_at ?? p.created_at, now))} auf Freigabe (risk:high): ${p.html_url}` });
    }
  }
  if (paused) incidents.push({ key: `pause:${pausedUntil}`, text: `Pause aktiv bis ${pausedUntil} (AGENT_PAUSED_UNTIL, meist Claude-Limit).` });
  const quotaRows = buildQuotaRows(snap.usage, limitsFile);
  for (const q of quotaRows.filter((r) => r.over)) {
    incidents.push({ key: `quota:${q.key}`, text: `Kontingent ${q.name} bei ${q.pct} % (${q.text} von ${q.limit}).` });
  }

  // --- Selbstheilung ---
  const conflictAsks = {};
  for (const p of openPrs.filter((x) => isAgentPr(x) && !x.draft && !labelNames(x).includes("no-automerge") && x.mergeable_state === "dirty")) {
    const asks = (prev.conflictAsks ?? {})[p.number] ?? [];
    const waited = asks.length ? mins(asks[asks.length - 1], now) >= CLAUDE_RETRY_MIN : true;
    conflictAsks[p.number] = asks;
    if (asks.length < MAX_CLAUDE_ASKS && waited) {
      conflictAsks[p.number] = [...asks, now.toISOString()];
      actions.push({
        type: "ask-claude",
        pr: p.number,
        text: `@claude Dieser PR hat einen Merge-Konflikt mit main (Versuch ${asks.length + 1} von ${MAX_CLAUDE_ASKS}). Bitte \`origin/main\` in den Branch mergen, Konflikte lösen, Lint, Typecheck und Tests laufen lassen und pushen. Keine Änderungen am Scope.`,
      });
    } else if (asks.length >= MAX_CLAUDE_ASKS && waited) {
      incidents.push({ key: `conflict:${p.number}`, text: `PR #${p.number} hat weiter einen Merge-Konflikt, @claude scheiterte ${MAX_CLAUDE_ASKS}×: ${p.html_url}` });
    }
  }
  for (const p of openPrs.filter((x) => APPROVAL_LABELS.some((l) => labelNames(x).includes(l)) && checks[x.number]?.mergeGate === "failure")) {
    incidents.push({ key: `stale-gate:${p.number}`, text: `PR #${p.number}: \`merge-gate\` ist rot, obwohl freigegeben (Freigabe vor neuem Commit). Bitte Label \`freigegeben\` entfernen und neu setzen: ${p.html_url}` });
  }
  // Abgleich wie im Dispatcher (SIN-240): Merge → Done; ohne Worker und PR seit 60 Min → Todo.
  const runningWorkers = running.map((r) => idOf(r.display_title)).filter(Boolean);
  const reconciled = reconcile(issues, prs.map((p) => ({ title: p.title, head: p.head, state: p.state, merged: Boolean(p.merged_at) })), { runningWorkers, now });
  for (const { issue } of reconciled.filter((a) => a.to === "Done")) actions.push({ type: "linear-done", issue });
  for (const { issue } of reconciled.filter((a) => a.to === "Todo")) actions.push({ type: "linear-todo", issue });

  // Merker: nur aktive Vorfälle bleiben; eine Meldung je Schlüssel, bis er verschwindet und später wiederkommt.
  const reportedBefore = new Set(prev.reported ?? []);
  const fresh = incidents.filter((i) => !reportedBefore.has(i.key));
  // Planer nachfüllen (SIN-253): Bauphase: unter 6 startbaren Todos, höchstens alle 2 h (SIN-262, Repo-Variablen REFILL_*; Merker `lastRefill`).
  // Linear nicht lesbar (SIN-263): „0 startbar“ ist dann nur geraten. Kein Anstoß und keine 2-h-Sperre, der nächste Takt versucht es erneut.
  const refill =
    snap.linearOk === false
      ? { trigger: false, reason: "Linear nicht lesbar, nächster Versuch beim nächsten Takt", maxIssues: 0, bugsOnly: false }
      : decideRefill({ startable: order.length, phase: phase.phase, lastRefill: prev.lastRefill, quotaOver: overQuota(quotaRows), paused, now });
  const refillCfg = refillConfig(process.env);
  const lastRefill = refill.trigger ? now.toISOString() : prev.lastRefill;
  const state = { reported: incidents.map((i) => i.key), conflictAsks, ...(lastRefill ? { lastRefill } : {}), ...(prev.refilled != null && !refill.trigger ? { refilled: prev.refilled } : {}) };
  if (refill.trigger) state.refilled = refill.maxIssues;

  // Kick: Dispatcher anstoßen, wenn nichts läuft, aber etwas startbar ist und der letzte Lauf lange her ist.
  const lastDispatch = runs.filter((r) => r.name === "dispatch").reduce((m, r) => (r.created_at > m ? r.created_at : m), "");
  const kick = !running.length && startable && !paused && mins(lastDispatch, now) >= KICK_MIN;

  // --- Text ---
  const out = [`# ${STATUS_TITLE}`, "", `Stand: ${now.toISOString()} (UTC). Dieser Text wird bei jedem Lauf neu geschrieben.`, ""];
  out.push("## Jetzt", "", `- ${renderPhase(phase)}`);
  if (running.length) {
    const how = running.length > 1 ? "parallel" : "einzeln";
    for (const r of running) out.push(`- Worker ${idOf(r.display_title) ?? "?"} (${r.status === "in_progress" ? "läuft" : "wartet"}) seit ${hm(mins(r.created_at, now))}, ${how}: [Lauf](${r.html_url})`);
  } else out.push("- Kein Worker läuft.");
  if (paused) out.push(`- ⏸ Pause bis ${pausedUntil}.`);
  out.push("");
  if (openPrs.length) {
    out.push("Offene PRs:", "");
    for (const p of openPrs) {
      const wait = needsApproval(p) ? `, wartet auf Freigabe seit ${hm(mins(p.updated_at ?? p.created_at, now))}` : "";
      const conflict = p.mergeable_state === "dirty" ? ", Merge-Konflikt" : "";
      out.push(`- #${p.number} ${cell(p.title)}: ${riskOf(p)}${p.draft ? ", Draft" : ""}${wait}${conflict}`);
    }
  } else out.push("Keine offenen PRs.");
  out.push("", "## Schlange", "");
  if (!issues.length) out.push("Linear nicht lesbar.");
  else {
    order.slice(0, 5).forEach((i, n) => out.push(`${n + 1}. ${i.identifier} ${cell(i.title)} (Spur ${laneOf(i)})`));
    if (!order.length) out.push("Kein startbares Todo.");
    const blocked = todo.filter((i) => !order.includes(i));
    for (const i of blocked.slice(0, 5)) {
      const why = hasOpenBlockers(i)
        ? `blockiert durch ${(i.inverseRelations?.nodes ?? []).filter((r) => r.type === "blocks" && !["completed", "canceled"].includes(r.issue?.state?.type)).map((r) => r.issue.identifier).join(", ")}`
        : isHumanIssue(i)
          ? "wartet auf Mensch (Label design/abnahme/needs-human)"
          : "Cursor hat noch Vorrang (1 h)";
      out.push(`- ⛔ ${i.identifier} ${cell(i.title)}: ${why}`);
    }
  }
  out.push(
    state.lastRefill
      ? `- Planer nachgefüllt: angestoßen ${state.lastRefill} (bis zu ${state.refilled ?? "?"} Issues, höchstens 1× alle ${refillCfg.cooldownH} h)`
      : "- Planer nachgefüllt: noch nicht",
  );
  const nextAt = nextRefillAt(state.lastRefill, refillCfg.cooldownH);
  const earliest = !nextAt || nextAt <= now ? "jetzt möglich" : `${nextAt.toISOString().slice(11, 16)} UTC`;
  out.push(phase.phase === "betrieb" ? `- Schlange: ${order.length} startbar, Betrieb: kein Nachfüllen (Wochenplan)` : `- Schlange: ${order.length} startbar, nächstes Nachfüllen frühestens ${earliest}`);
  out.push("", "## Letzte 24 h", "");
  out.push(`- Gemergt: ${mergedPrs.length ? mergedPrs.map((p) => `#${p.number}`).join(", ") : "keine"}`);
  out.push(`- Fehlgeschlagene Worker: ${failed.length ? "" : "keine"}`);
  for (const r of failed) out.push(`  - ${idOf(r.display_title) ?? "?"}: ${cell(failures[r.id] || "kein Fehlertext lesbar")} ([Lauf](${r.html_url}))`);
  out.push(`- Pausen: ${paused ? `aktiv bis ${pausedUntil}` : "keine aktiv"}`);
  out.push("", "## Kontingente", "", renderQuotaTable(quotaRows));
  if (snap.deploy) out.push("", renderDeploy(snap.deploy));
  out.push("", `<!-- loop-status-state: ${JSON.stringify(state)} -->`);

  return { body: out.join("\n"), incidents, fresh, actions, state, kick, quotaRows, refill };
}

/** Kommentar mit Erwähnung für neue Vorfälle; leer, wenn es nichts Neues gibt. */
export function renderAlert(fresh) {
  if (!fresh.length) return "";
  return [`${MENTION} Loop-Status: ${fresh.length === 1 ? "ein Problem" : `${fresh.length} Probleme`}`, "", ...fresh.map((i) => `- ${i.text}`)].join("\n");
}

export function parseState(body) {
  try {
    return STATE_RE.test(body ?? "") ? JSON.parse(body.match(STATE_RE)[1]) : {};
  } catch {
    return {};
  }
}

// ---------- Netz ----------

const GH = "https://api.github.com";

export async function gh(path, { method = "GET", body, token = process.env.GITHUB_TOKEN, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(path.startsWith("http") ? path : `${GH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path}: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/** Eine Zeile Fehlertext eines fehlgeschlagenen Laufs: erste Fehler-Annotation, sonst der Name des roten Schritts. */
export async function fetchFailureLine(repo, runId, call = gh) {
  const { jobs } = await call(`/repos/${repo}/actions/runs/${runId}/jobs?per_page=20`);
  const job = jobs.find((j) => j.conclusion === "failure");
  if (!job) return "";
  try {
    const notes = await call(`/repos/${repo}/check-runs/${job.id}/annotations`);
    const err = notes.find((n) => n.annotation_level === "failure") ?? notes[0];
    if (err?.message) return cell(err.message).slice(0, 200);
  } catch {
    /* Rückfall unten */
  }
  const step = job.steps?.find((s) => s.conclusion === "failure");
  return cell(`Schritt „${step?.name ?? job.name}“ fehlgeschlagen`);
}

async function collectGithub(repo, now) {
  const since = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
  const { workflow_runs } = await gh(`/repos/${repo}/actions/runs?per_page=100&created=>=${since}`);
  const runs = workflow_runs.map((r) => ({
    id: r.id, name: r.name, display_title: r.display_title, status: r.status, conclusion: r.conclusion,
    created_at: r.created_at, updated_at: r.updated_at, html_url: r.html_url,
  }));
  const list = await gh(`/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=50`);
  const prs = [];
  const checks = {};
  for (const p of list) {
    const pr = {
      number: p.number, title: p.title, head: p.head?.ref, draft: p.draft, state: p.state, merged_at: p.merged_at,
      labels: p.labels.map((l) => l.name), created_at: p.created_at, updated_at: p.updated_at, html_url: p.html_url,
    };
    if (p.state === "open") {
      pr.mergeable_state = (await gh(`/repos/${repo}/pulls/${p.number}`)).mergeable_state;
      const cr = await gh(`/repos/${repo}/commits/${p.head.sha}/check-runs?per_page=100`);
      checks[p.number] = { mergeGate: cr.check_runs.find((c) => c.name === "merge-gate")?.conclusion ?? null };
    }
    prs.push(pr);
  }
  return { runs, prs, checks };
}

const serviceOf = (url) => (/vercel/.test(url) ? "Vercel" : /supabase/.test(url) ? "Supabase" : /sentry/.test(url) ? "Sentry" : /langfuse/.test(url) ? "Langfuse" : new URL(url).hostname);

/** Misst, was ohne Bezahlplan lesbar ist. Fehlt ein Token oder schlägt die Abfrage fehl: { error } → „nicht messbar“. */
export async function collectUsage({ env = process.env, now = new Date(), runs = [], fetchImpl = fetch } = {}) {
  /** @type {Record<string, any>} */
  const usage = { github_actions_minuten: { text: "frei (Repo öffentlich)" }, posthog_events_monat: { error: "keine dokumentierte Verbrauchs-API" } };
  const today = now.toISOString().slice(0, 10);
  usage.github_actions_laeufe_tag = runs.filter((r) => String(r.created_at).startsWith(today)).length;
  usage.vercel_build_minuten = { error: "nicht per API lesbar" };
  usage.api_kosten_eur = { error: "Ledger nicht angebunden" };
  const until = parsePausedUntil(env.AGENT_PAUSED_UNTIL);
  usage.claude_max = { text: `kein Zähler; ${until && until > now ? `pausiert bis ${until.toISOString()}` : "keine Limit-Pause aktiv"}` };
  const json = (url, init) => fetchJson(serviceOf(url), url, init, { fetchImpl });
  const guard = async (key, missing, fn) => {
    if (missing) return void (usage[key] = { error: `${missing} fehlt` });
    try {
      usage[key] = await fn();
    } catch (e) {
      usage[key] = { error: `Abfrage fehlgeschlagen: ${e.message}` };
    }
  };
  const bearer = (t) => ({ headers: { Authorization: `Bearer ${t}` } });
  await guard("vercel_deployments_tag", !env.VERCEL_TOKEN && "VERCEL_TOKEN", async () => {
    const q = new URLSearchParams({ since: String(now.getTime() - DAY_MS), limit: "100" });
    if (env.VERCEL_PROJECT_ID) q.set("projectId", env.VERCEL_PROJECT_ID);
    if (env.VERCEL_TEAM_ID) q.set("teamId", env.VERCEL_TEAM_ID);
    return (await json(`https://api.vercel.com/v6/deployments?${q}`, bearer(env.VERCEL_TOKEN))).deployments.length;
  });
  const sb = !env.SUPABASE_ACCESS_TOKEN ? "SUPABASE_ACCESS_TOKEN" : !env.SUPABASE_PROJECT_REF ? "SUPABASE_PROJECT_REF" : null;
  await guard("supabase_db_mb", sb, async () => {
    const r = await json(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "select pg_database_size(current_database()) as bytes" }),
    });
    return Math.round(Number(r[0].bytes) / 1048576);
  });
  await guard("supabase_projekte", !env.SUPABASE_ACCESS_TOKEN && "SUPABASE_ACCESS_TOKEN", async () => {
    const r = await json("https://api.supabase.com/v1/projects", bearer(env.SUPABASE_ACCESS_TOKEN));
    return r.filter((p) => String(p.status).startsWith("ACTIVE")).length;
  });
  await guard("sentry_events_monat", !env.SENTRY_AUTH_TOKEN ? "SENTRY_AUTH_TOKEN" : !env.SENTRY_ORG ? "SENTRY_ORG" : null, async () => {
    const base = env.SENTRY_BASE_URL || "https://de.sentry.io";
    const q = new URLSearchParams({ statsPeriod: "30d", field: "sum(quantity)", category: "error" });
    const r = await json(`${base}/api/0/organizations/${env.SENTRY_ORG}/stats-summary/?${q}`, bearer(env.SENTRY_AUTH_TOKEN));
    return Number(r.groups?.reduce((s, g) => s + (g.totals?.["sum(quantity)"] ?? 0), 0) ?? 0);
  });
  const lf = !env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY ? "LANGFUSE_PUBLIC_KEY/SECRET_KEY" : null;
  await guard("langfuse_units_monat", lf, async () => {
    const auth = Buffer.from(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`).toString("base64");
    const from = new Date(now.getTime() - 30 * DAY_MS).toISOString();
    const base = env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
    let page = 1;
    let units = 0;
    for (;;) {
      const r = await json(`${base}/api/public/metrics/daily?fromTimestamp=${encodeURIComponent(from)}&page=${page}&limit=50`, { headers: { Authorization: `Basic ${auth}` } });
      for (const d of r.data) units += (d.countTraces ?? 0) + (d.countObservations ?? 0);
      if (page >= (r.meta?.totalPages ?? 1)) break;
      page += 1;
    }
    return units;
  });
  return usage;
}

async function findOrCreateStatusIssue(repo) {
  const found = await gh(`/repos/${repo}/issues?labels=${STATUS_LABEL}&state=open&per_page=1`);
  if (found[0]) return found[0];
  try {
    await gh(`/repos/${repo}/labels`, { method: "POST", body: { name: STATUS_LABEL, color: "5319e7", description: "Angepinnter Loop-Status (SIN-238)" } });
  } catch {
    /* Label existiert schon */
  }
  const issue = await gh(`/repos/${repo}/issues`, { method: "POST", body: { title: STATUS_TITLE, body: "(wird gleich befüllt)", labels: [STATUS_LABEL] } });
  try {
    await gh("/graphql", { method: "POST", body: { query: `mutation { pinIssue(input: { issueId: "${issue.node_id}" }) { issue { id } } }` } });
  } catch {
    console.log("::warning::Issue konnte nicht angepinnt werden (Token-Recht oder schon 3 Pins).");
  }
  return issue;
}

function output(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) appendFileSync(file, `${name}=${value}\n`);
}

export async function main(argv, env = process.env) {
  const dry = argv.includes("--dry-run");
  const fixtureAt = argv.indexOf("--fixture");
  const limitsFile = JSON.parse(readFileSync(new URL("../../docs/autonomy/free-tier-limits.json", import.meta.url), "utf8"));
  const repo = env.GITHUB_REPOSITORY;
  let snap;
  let statusIssue = null;
  if (fixtureAt >= 0) {
    snap = JSON.parse(readFileSync(argv[fixtureAt + 1], "utf8"));
  } else {
    if (!repo || !env.GITHUB_TOKEN) throw new Error("GITHUB_REPOSITORY und GITHUB_TOKEN nötig (oder --fixture)");
    const now = new Date();
    const g = await collectGithub(repo, now);
    let issues = [];
    let linearOk = true;
    try {
      issues = await fetchProjectIssues();
    } catch (e) {
      linearOk = false;
      console.log(`Linear nicht lesbar: ${e.message}`);
    }
    const failures = {};
    for (const r of g.runs.filter((x) => x.name === "worker" && x.conclusion === "failure").slice(0, 5)) {
      try {
        failures[r.id] = await fetchFailureLine(repo, r.id);
      } catch {
        failures[r.id] = "";
      }
    }
    const phaseEnv = { phase: env.PHASE, observeDays: env.OBSERVE_DAYS, since: env.PHASE_SINCE, lastPlan: null };
    if (issues.length) phaseEnv.lastPlan = await lastPlanAt(linear).catch(() => null);
    const usage = await collectUsage({ env, now, runs: g.runs });
    // Production bündeln (SIN-266): Stand und Entscheidung; ausgelöst wird nach dem Schreiben des Status (unten).
    const vercelPct = percent(usage.vercel_deployments_tag, limitsFile.limits?.vercel_deployments_tag?.limit);
    const deploy = await planDeploy({ env, now, vercelPct, call: gh });
    snap = { now: now.toISOString(), ...g, issues, linearOk, failures, phaseEnv, paused: env.AGENT_PAUSED_UNTIL, usage, deploy };
    statusIssue = dry ? null : await findOrCreateStatusIssue(repo);
  }
  const prev = parseState(snap.previousBody ?? statusIssue?.body);
  const res = analyze(snap, limitsFile, prev);
  const alert = renderAlert(res.fresh);
  console.log(res.body);
  if (alert) console.log(`\n--- Erwähnung ---\n${alert}`);
  for (const a of res.actions) {
    const what = a.type === "linear-done" ? `${a.issue.identifier} → Done` : a.type === "linear-todo" ? `${a.issue.identifier} → Todo` : `PR #${a.pr}: ${a.text}`;
    console.log(`\n--- Aktion ${a.type} ---\n${what}`);
  }
  console.log(`\nPlaner nachfüllen: ${res.refill.trigger ? `ja (${res.refill.reason}, bis zu ${res.refill.maxIssues} Issues${res.refill.bugsOnly ? ", nur Bugs" : ""})` : `nein (${res.refill.reason})`}`);
  output("kick", String(res.kick));
  // Dry-Run und Fixture stoßen nichts an; der Merker wird mit dem Status-Text unten gespeichert.
  const live = !dry && fixtureAt < 0;
  output("refill", String(live && res.refill.trigger));
  output("refill_max", String(res.refill.maxIssues));
  output("refill_bugs_only", String(res.refill.bugsOnly));
  if (!live) return res;

  if (snap.deploy?.deploy) {
    if (!env.VERCEL_DEPLOY_HOOK_PROD) console.log("Production-Deploy fällig, aber VERCEL_DEPLOY_HOOK_PROD fehlt.");
    else {
      const r = await triggerDeploy(env.VERCEL_DEPLOY_HOOK_PROD).catch((e) => ({ ok: false, status: e.message }));
      console.log(r.ok ? "Production-Deploy ausgelöst (Deploy Hook)." : `::warning::Deploy Hook fehlgeschlagen (${r.status}), nächster Versuch beim nächsten Takt.`);
    }
  }

  // Erst melden, dann den Merker speichern: schlägt die Meldung fehl, kommt sie beim nächsten Lauf noch einmal.
  if (alert) await gh(`/repos/${repo}/issues/${statusIssue.number}/comments`, { method: "POST", body: { body: alert } });
  await gh(`/repos/${repo}/issues/${statusIssue.number}`, { method: "PATCH", body: { body: res.body } });
  for (const a of res.actions) {
    // Kommentare mit GITHUB_TOKEN lösen keine Workflows aus (claude.yml): @claude braucht den Agenten-Token (D-43).
    if (a.type === "ask-claude") {
      const token = env.AGENT_WORKFLOW_TOKEN || env.GITHUB_TOKEN;
      await gh(`/repos/${repo}/issues/${a.pr}/comments`, { method: "POST", body: { body: a.text }, token });
    }
    if (a.type === "linear-done") {
      await setState(a.issue, "Done");
      await comment(a.issue.id, "Status auf Done gesetzt: der PR ist gemergt (Loop-Wächter, SIN-238).");
    }
    if (a.type === "linear-todo") {
      await setState(a.issue, "Todo");
      await comment(a.issue.id, "Zurück auf Todo: seit über 60 Min weder Worker noch PR (Loop-Wächter, SIN-240).");
    }
  }
  return res;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
