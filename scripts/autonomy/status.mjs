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
import { collectBackup } from "./backup.mjs";
import { collectLiveCheck } from "./live-check.mjs";
import { planDeploy, renderDeploy, triggerDeploy } from "./deploy.mjs";
import { sendTelegramPlain } from "./telegram.mjs";
import { parseTokens, renderTokens } from "./tokens.mjs";
import { decideRefill, nextRefillAt, overQuota, refillConfig } from "./refill.mjs";
import { DIAG_WORKFLOWS, LINEAR_WARN_PCT, STALL_PREFIX, diagnoseStall, linearQuota, linearQuotaIssue, newStallIssue, pendingDecisions, renderLinearQuota } from "./diagnose.mjs";
import { GATE_LABEL, GATE_PREFIX, collectGateFailures, detectGateBreaks, gateActions, waitingIssues } from "./warten.mjs";
import { lastPlanAt, phaseAllowsIssue, phaseState, renderPhase } from "./phase.mjs";
import {
  MAX_PARALLEL,
  linear,
  comment,
  countIssues,
  createLinearIssues,
  doneTitlesSince,
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
/** Geister-Issue: „In Progress“ ohne Worker-Lauf und ohne PR (SIN-291: 15 Min, vorher 60). */
export const STUCK_MIN = 15;
export const APPROVAL_MIN = 120;
export const KICK_MIN = 10;
export const VERCEL_WARN = 70;
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
  ["linear_issues", "Linear Free: Issues"],
  ["claude_max", "Claude Max"],
  ["api_kosten_eur", "Anthropic/OpenAI API: Kosten (Ledger)"],
];

/** Eigene Warnschwellen je Kontingent (sonst `warnschwelle_prozent`): Linear-Issues ab 85 % (SIN-291). */
const WARN_PCT = { linear_issues: LINEAR_WARN_PCT };

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
    row.over = row.pct != null && row.pct >= (WARN_PCT[key] ?? warn); // ab 80 % (SIN-251, wie der Wächter SIN-225)
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
  // Wartende PRs (SIN-327): Issue bleibt „In Progress“, belegt aber keinen Platz; getrennt von laufenden Workern.
  const waiting = waitingIssues(issues, prs.map((p) => ({ ...p, ci: checks[p.number]?.ci })), running.map((r) => idOf(r.display_title)).filter(Boolean));
  const active = started.filter((i) => !waiting.has(i.identifier));
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
  const startable = order.length > 0 && active.length < MAX_PARALLEL;
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

  // Production hängt (SIN-309): Hook-Deploy CANCELED/ERROR → Meldung und Bug-Issue, kein zweiter Versuch für denselben Commit.
  const stuckDeploy = snap.deploy?.stuck ?? null;
  const deployBugs = [];
  if (stuckDeploy) {
    const at = stuckDeploy.since.slice(11, 16);
    const short = stuckDeploy.sha.slice(0, 7);
    incidents.push({ key: `deploy-stuck:${stuckDeploy.sha}`, text: `Production hängt seit ${at} UTC: Hook-Deploy für ${short} ist ${stuckDeploy.state}. Kein neuer Versuch für diesen Commit, der nächste kommt mit einem neuen Commit auf main.` });
    deployBugs.push({
      lane: "backend",
      priority: 1,
      labels: ["claude", "Bug"],
      title: `Bug: Production-Deploy ${stuckDeploy.state} (${short})`,
      description: `Der Hook-Deploy für Commit ${stuckDeploy.sha} (ausgelöst ${stuckDeploy.since}) endete mit ${stuckDeploy.state}. Production hängt seit ${at} UTC. Der Wächter versucht diesen Commit nicht erneut (SIN-309). Bitte das Build-Log in Vercel lesen, die Ursache beheben und per Merge einen neuen Commit auslösen.`,
    });
  }

  // Production-Alarme (SIN-332): „nicht lesbar“ und „> 3 h hinter main“ sind rot, kein grauer Zustand. Merker `deployAlarm` für das Tages-Update.
  const deployAlarms = [];
  if (snap.deploy?.unreadable) deployAlarms.push({ key: "deploy-unreadable", text: `Production-Stand nicht lesbar (${snap.deploy.unreadable}). Wächter und Deploy sind blind, Vercel-Token und Team-Scope prüfen.` });
  if (snap.deploy?.behind) deployAlarms.push({ key: "deploy-behind", text: `Production liegt seit ${snap.deploy.behind.since.slice(11, 16)} UTC (${snap.deploy.behind.hours} h) hinter main: gemergter App-Code ist nicht live.` });
  for (const a of deployAlarms) incidents.push(a);

  // Sicherung (SIN-293): Fehler oder überfällig = Meldung. Fehlt der Messwert (nicht lesbar), bleibt es still.
  const backup = snap.backup ?? null;
  if (backup?.incident) incidents.push(backup.incident);
  // Live-Check nach dem Deploy (SIN-319): Meldung erst, wenn er nach dem Revert noch rot ist.
  const liveCheck = snap.liveCheck ?? null;
  if (liveCheck?.incident) incidents.push(liveCheck.incident);

  // --- Selbst-Diagnose (SIN-291): Ursache aus den letzten Logs, Bug-Issue ohne Duplikat ---
  const diagnosis =
    active.length < MAX_PARALLEL
      ? diagnoseStall({ running: running.length, paused, startable: order.length, idleMin: mins(idleSince, now), logs: snap.logs ?? [] })
      : null;
  if (diagnosis) incidents.push({ key: `stall:${diagnosis.cause}`, text: `Stillstand: ${diagnosis.label}. ${diagnosis.reason}` });
  const known = [...issues, ...(snap.doneTitles ?? []).map((title) => ({ title }))];
  // Gate-Bruch auf main (SIN-327): derselbe rote Schritt in 2+ PRs mit verschiedenem Code → ein Urgent-Bug, PRs nicht weiter reparieren.
  const { breaks } = detectGateBreaks(snap.gateFailures ?? [], known);
  const gateBugOpen = issues.some((i) => String(i.title).startsWith(GATE_PREFIX));
  for (const b of breaks) {
    incidents.push({ key: `gate:${b.check}/${b.step}`, text: `Gate-Bruch: \`${b.check}\` / \`${b.step}\` scheitert in ${b.prs.map((n) => `#${n}`).join(", ")}. Urgent-Bug-Issue ${b.issue ? "angelegt" : "offen"}, Reparatur der PRs gesperrt.` });
  }
  const linearQ = linearQuota(typeof snap.usage?.linear_issues === "number" ? snap.usage.linear_issues : null);
  const stop = linearQ.level === "stop";
  const bugs = [newStallIssue(diagnosis, known), ...breaks.map((b) => b.issue).filter(Boolean), ...deployBugs.filter((b) => !known.some((k) => k.title === b.title)), ...(stop ? [linearQuotaIssue(linearQ)].filter((i) => i && !known.some((k) => k.title === i.title)) : [])].filter(Boolean);
  const decisions = snap.decisions ?? [];
  for (const d of decisions) incidents.push({ key: `decision:${d.number}`, text: `Entscheidung nötig in gemergtem PR #${d.number} (${cell(d.title)}): ${d.question}` });

  // --- Selbstheilung ---
  for (const issue of bugs) actions.push({ type: "create-issue", issue });
  for (const a of gateActions(openPrs, breaks, gateBugOpen)) actions.push(/** @type {any} */ (a));
  const conflictAsks = {};
  for (const p of openPrs.filter((x) => isAgentPr(x) && !x.draft && !labelNames(x).includes("no-automerge") && x.mergeable_state === "dirty")) {
    // SIN-312: erzeugte Dateien löst konflikt.mjs ohne KI (vorher im Lauf); hier nur noch echte Code-Konflikte.
    if (snap.conflictResults?.[p.number] === "resolved") continue;
    if (paused) {
      incidents.push({ key: `conflict-web:${p.number}`, text: `PR #${p.number} hat einen Code-Konflikt, Claude-Kontingent leer (Pause bis ${pausedUntil}). Konflikt per Web-Editor lösen: ${p.html_url} öffnen, unten „Resolve conflicts“, Markierungen <<<<<<< bis >>>>>>> bereinigen, „Mark as resolved“, „Commit merge“.` });
      continue;
    }
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
  // Abgleich wie im Dispatcher (SIN-240): Merge → Done; ohne Worker und PR seit 15 Min (SIN-291) → Todo.
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
      : decideRefill({ startable: order.length, phase: phase.phase, lastRefill: prev.lastRefill, quotaOver: overQuota(quotaRows), paused, linearFull: stop, now });
  const refillCfg = refillConfig(process.env);
  const lastRefill = refill.trigger ? now.toISOString() : prev.lastRefill;
  const state = { reported: incidents.map((i) => i.key), conflictAsks, ...(lastRefill ? { lastRefill } : {}), ...(prev.refilled != null && !refill.trigger ? { refilled: prev.refilled } : {}), ...(snap.deploy?.attempt ? { deployAttempt: snap.deploy.attempt } : {}), ...(stuckDeploy ? { deployStuck: stuckDeploy } : {}), ...(deployAlarms.length ? { deployAlarm: deployAlarms.map((a) => a.text) } : {}) };
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
  if (paused) out.push(`- ⏸ Pausiert bis ${pausedUntil}. Fortsetzen: Workflow \`loop-pause\` mit „fortsetzen“.`);
  out.push(`- ${backup ? `${backup.ok ? "" : "⚠️ "}${backup.line}` : "Letzte Sicherung: nicht lesbar"}`);
  if (liveCheck) out.push(`- ${liveCheck.ok ? "" : "⚠️ "}${liveCheck.line}`);
  if (diagnosis) out.push(`- ⚠️ Stillstand: ${diagnosis.label} (${diagnosis.reason})`);
  if (linearQ.level !== "unknown" && linearQ.level !== "ok") out.push(`- ⚠️ ${renderLinearQuota(linearQ)}`);
  out.push("");
  if (deployAlarms.length) {
    out.push("## Braucht dich (rot)", "");
    for (const a of deployAlarms) out.push(`- 🔴 ${a.text}`);
    out.push("");
  }
  if (decisions.length) {
    out.push("## Braucht dich", "", "Entscheidungen in schon gemergten PRs, bis du im PR antwortest (Kommentar) oder das Label `entschieden` setzt:", "");
    for (const d of decisions) out.push(`- #${d.number} ${cell(d.title)}: ${d.question}`);
    out.push("");
  }
  if (waiting.size) {
    out.push("Wartende PRs (belegen keinen Platz, Issue bleibt „In Progress“):", "");
    for (const [id, w] of waiting) out.push(`- ${id}: PR #${w.pr}, ${w.reason}`);
    out.push("");
  }
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
  out.push("", "## Token-Ablauf", "", renderTokens(snap.tokens, now), "", "Liste ohne Werte: docs/autonomy/tokens.md");
  if (snap.deploy) out.push("", renderDeploy(snap.deploy));
  const split = snap.usage?.vercel_split;
  if (split && typeof snap.usage.vercel_deployments_tag === "number") {
    const n = snap.usage.vercel_deployments_tag;
    out.push(`- Vercel heute: ${n}/100 (Production ${split.production}, Vorschau ${split.preview})${n >= VERCEL_WARN ? " ⚠️ ab 70 Deploys: Limit droht" : ""}`);
  }
  out.push("", `<!-- loop-status-state: ${JSON.stringify(state)} -->`);

  return { body: out.join("\n"), incidents, fresh, actions, state, kick, quotaRows, refill, diagnosis };
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

/** Text einer URL (Job-Log: GitHub antwortet mit einem Redirect auf den Log-Speicher). */
async function ghText(path, { token = process.env.GITHUB_TOKEN, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${GH}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status}`);
  return res.text();
}

/**
 * Logs für die Selbst-Diagnose (SIN-291): je Workflow (planner, dispatch, worker) der letzte abgeschlossene Lauf;
 * nur wenn er fehlgeschlagen ist (ein späterer Erfolg heilt den Vorfall). Letzte 6000 Zeichen des roten Jobs.
 * @returns {Promise<{ workflow: string, runId: number, url: string, text: string, at: string }[]>} neueste zuerst
 */
export async function collectLogs(repo, runs, { call = gh, text = ghText } = {}) {
  const out = [];
  for (const workflow of DIAG_WORKFLOWS) {
    const last = runs
      .filter((r) => r.name === workflow && r.status === "completed")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    if (!last || last.conclusion !== "failure") {
      // Kein roter Lauf: sonst bliebe der Wächter ohne Log und meldete „Ursache nicht erkennbar“ (SIN-328).
      const what = last ? `Letzter Lauf #${last.id} ${last.conclusion ?? last.status} am ${last.created_at}` : "Kein Lauf gefunden (Zeitplan feuert nicht?)";
      out.push({ workflow, runId: last?.id, url: last?.html_url, text: `Kein roter Lauf: ${workflow}. ${what}`, at: last?.created_at ?? "" });
      continue;
    }
    try {
      const { jobs } = await call(`/repos/${repo}/actions/runs/${last.id}/jobs?per_page=20`);
      const job = jobs.find((j) => j.conclusion === "failure") ?? jobs.at(-1);
      const log = job ? await text(`/repos/${repo}/actions/jobs/${job.id}/logs`) : "";
      out.push({ workflow, runId: last.id, url: last.html_url, text: log.slice(-6000), at: last.created_at });
    } catch (e) {
      out.push({ workflow, runId: last.id, url: last.html_url, text: `Log nicht lesbar: ${e.message}`, at: last.created_at });
    }
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/** Offene Entscheidungen aus gemergten PRs; Kommentare nur für PRs, die überhaupt eine Frage haben. */
export async function collectDecisions(repo, prs, now, { call = gh, owner = "siinanXD" } = {}) {
  const candidates = pendingDecisions(prs, {}, { owner, now });
  const comments = {};
  for (const c of candidates) {
    try {
      const list = await call(`/repos/${repo}/issues/${c.number}/comments?per_page=100`);
      comments[c.number] = list.map((x) => ({ user: x.user?.login, created_at: x.created_at }));
    } catch {
      /* ohne Kommentare bleibt die Frage sichtbar */
    }
  }
  return pendingDecisions(prs, comments, { owner, now });
}

async function collectGithub(repo, now) {
  const since = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
  const { workflow_runs } = await gh(`/repos/${repo}/actions/runs?per_page=100&created=>=${since}`);
  const runs = workflow_runs.map((r) => ({
    id: r.id, name: r.name, display_title: r.display_title, status: r.status, conclusion: r.conclusion,
    created_at: r.created_at, updated_at: r.updated_at, html_url: r.html_url,
  }));
  const list = await gh(`/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100`);
  const prs = [];
  const checks = {};
  for (const p of list) {
    const pr = {
      number: p.number, title: p.title, body: p.merged_at ? p.body : undefined, head: p.head?.ref, draft: p.draft, state: p.state, merged_at: p.merged_at,
      labels: p.labels.map((l) => l.name), created_at: p.created_at, updated_at: p.updated_at, html_url: p.html_url,
    };
    if (p.state === "open") {
      pr.sha = p.head.sha;
      pr.mergeable_state = (await gh(`/repos/${repo}/pulls/${p.number}`)).mergeable_state;
      const cr = await gh(`/repos/${repo}/commits/${p.head.sha}/check-runs?per_page=100`);
      checks[p.number] = { mergeGate: cr.check_runs.find((c) => c.name === "merge-gate")?.conclusion ?? null, ci: cr.check_runs.find((c) => c.name === "build")?.conclusion ?? undefined, checkRuns: cr.check_runs };
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
  // Linear Free (SIN-291): Issue-Zahl gegen das Limit von 250.
  await guard("linear_issues", !env.LINEAR_API_KEY && "LINEAR_API_KEY", () =>
    countIssues((q, v) => linear(q, v, { key: env.LINEAR_API_KEY, fetchImpl })),
  );
  await guard("vercel_deployments_tag", !env.VERCEL_TOKEN && "VERCEL_TOKEN", async () => {
    const q = new URLSearchParams({ since: String(now.getTime() - DAY_MS), limit: "100" });
    if (env.VERCEL_PROJECT_ID) q.set("projectId", env.VERCEL_PROJECT_ID);
    if (env.VERCEL_TEAM_ID) q.set("teamId", env.VERCEL_TEAM_ID);
    const list = (await json(`https://api.vercel.com/v6/deployments?${q}`, bearer(env.VERCEL_TOKEN))).deployments;
    const production = list.filter((d) => d.target === "production").length;
    usage.vercel_split = { production, preview: list.length - production };
    return list.length;
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

/** Token-Liste aus docs/autonomy/tokens.md; nicht lesbar → [] („Token-Liste nicht lesbar“). */
function readTokens() {
  try {
    return parseTokens(readFileSync(new URL("../../docs/autonomy/tokens.md", import.meta.url), "utf8"));
  } catch {
    return [];
  }
}

/** Ergebnis von konflikt.mjs (KONFLIKT_FILE); fehlt die Datei, fragt der Wächter wie bisher @claude. */
function readConflictResults(env) {
  try {
    return env.KONFLIKT_FILE ? JSON.parse(readFileSync(env.KONFLIKT_FILE, "utf8")) : {};
  } catch {
    return {};
  }
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
    snap.tokens ??= readTokens();
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
    statusIssue = dry ? null : await findOrCreateStatusIssue(repo);
    const deploy = await planDeploy({ env, now, vercelPct, call: gh, prevAttempt: parseState(statusIssue?.body).deployAttempt ?? null });
    // Auslösen vor dem Schreiben des Status, damit der Versuch (Commit, Zeit) im Merker steht (SIN-309). Nur bei Erfolg: ein Netzfehler sperrt nicht.
    if (deploy.deploy && !dry) {
      const token = env.AGENT_WORKFLOW_TOKEN;
      if (!token) console.log("Production-Deploy fällig, aber AGENT_WORKFLOW_TOKEN fehlt.");
      else {
        const r = await triggerDeploy({ repo, token }).catch((e) => ({ ok: false, status: e.message }));
        if (r.ok && deploy.headSha) deploy.attempt = { sha: deploy.headSha, at: now.toISOString(), state: null };
        console.log(r.ok ? "Production-Deploy ausgelöst (Workflow production-deploy)." : `::warning::Start von production-deploy fehlgeschlagen (${r.status}), nächster Versuch beim nächsten Takt.`);
      }
    }
    // Selbst-Diagnose (SIN-291): Logs der letzten roten Läufe, offene Entscheidungen, kürzlich erledigte Bug-Issues.
    const logs = await collectLogs(repo, g.runs).catch(() => []);
    const decisions = await collectDecisions(repo, g.prs, now).catch(() => []);
    const doneTitles = linearOk ? [...(await doneTitlesSince(STALL_PREFIX, now).catch(() => [])), ...(await doneTitlesSince(GATE_PREFIX, now).catch(() => []))] : [];
    // Rote Schritte offener PRs für den Gate-Bruch (SIN-327); nur PRs mit rotem Check kosten Anfragen.
    const redPrs = g.prs.filter((p) => p.state === "open" && g.checks[p.number]?.checkRuns?.some((c) => c.conclusion === "failure")).map((p) => ({ number: p.number, sha: p.sha, checkRuns: g.checks[p.number].checkRuns }));
    const gateFailures = await collectGateFailures(repo, env.GITHUB_TOKEN, redPrs).catch(() => []);
    const backup = await collectBackup(repo, now, gh);
    const liveCheck = await collectLiveCheck(repo, gh);
    snap = { now: now.toISOString(), ...g, conflictResults: readConflictResults(env), backup, liveCheck, issues, linearOk, failures, phaseEnv, paused: env.AGENT_PAUSED_UNTIL, tokens: readTokens(), usage, deploy, logs, decisions, doneTitles, gateFailures };
  }
  const prev = parseState(snap.previousBody ?? statusIssue?.body);
  const res = analyze(snap, limitsFile, prev);
  const alert = renderAlert(res.fresh);
  console.log(res.body);
  if (alert) console.log(`\n--- Erwähnung ---\n${alert}`);
  for (const a of res.actions) {
    const what =
      a.type === "linear-done" ? `${a.issue.identifier} → Done`
      : a.type === "linear-todo" ? `${a.issue.identifier} → Todo`
      : a.type === "create-issue" ? `Bug-Issue: ${a.issue.title}\n${a.issue.description}`
      : `PR #${a.pr}: ${a.text}`;
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

  // Roter Deploy-Alarm (SIN-332): zusätzlich Telegram, einmal je Vorfall (wie die Erwähnung). Ohne Secrets still.
  const redFresh = res.fresh.filter((i) => i.key === "deploy-unreadable" || i.key === "deploy-behind");
  if (redFresh.length) await sendTelegramPlain(`Loop-Status, rot:\n${redFresh.map((i) => i.text).join("\n")}`, env).catch((e) => console.log(`::warning::Telegram: ${e.message}`));
  // Erst melden, dann den Merker speichern: schlägt die Meldung fehl, kommt sie beim nächsten Lauf noch einmal.
  if (alert) await gh(`/repos/${repo}/issues/${statusIssue.number}/comments`, { method: "POST", body: { body: alert } });
  await gh(`/repos/${repo}/issues/${statusIssue.number}`, { method: "PATCH", body: { body: res.body } });
  for (const a of res.actions) {
    // Kommentare mit GITHUB_TOKEN lösen keine Workflows aus (claude.yml): @claude braucht den Agenten-Token (D-43).
    if (a.type === "ask-claude") {
      const token = env.AGENT_WORKFLOW_TOKEN || env.GITHUB_TOKEN;
      await gh(`/repos/${repo}/issues/${a.pr}/comments`, { method: "POST", body: { body: a.text }, token });
    }
    if (a.type === "create-issue") {
      // Ist Linear selbst die Ursache (Limit), schlägt das Anlegen fehl: der Vorfall ging schon per Erwähnung an Sinan.
      await createLinearIssues([a.issue]).catch((e) => console.log(`::warning::Bug-Issue nicht angelegt: ${e.message}`));
    }
    // Label und Branch-Update mit dem Agenten-Token: nur so läuft die CI nach dem Push neu (SIN-240).
    if (a.type === "gate-block" || a.type === "gate-release") {
      const token = env.AGENT_WORKFLOW_TOKEN || env.GITHUB_TOKEN;
      try {
        if (a.type === "gate-block") {
          await gh(`/repos/${repo}/labels`, { method: "POST", body: { name: GATE_LABEL, color: "D93F0B", description: "Gate auf main kaputt: keine Reparatur (SIN-327)" }, token }).catch(() => {});
          await gh(`/repos/${repo}/issues/${a.pr}/labels`, { method: "POST", body: { labels: [GATE_LABEL] }, token });
        } else {
          await gh(`/repos/${repo}/issues/${a.pr}/labels/${GATE_LABEL}`, { method: "DELETE", token });
          await gh(`/repos/${repo}/pulls/${a.pr}/update-branch`, { method: "PUT", token });
        }
      } catch (e) {
        console.log(`::warning::${a.type} für PR #${a.pr} fehlgeschlagen: ${e.message}`);
      }
    }
    if (a.type === "linear-done") {
      await setState(a.issue, "Done");
      await comment(a.issue.id, "Status auf Done gesetzt: der PR ist gemergt (Loop-Wächter, SIN-238).");
    }
    if (a.type === "linear-todo") {
      await setState(a.issue, "Todo");
      await comment(a.issue.id, `Zurück auf Todo: seit über ${STUCK_MIN} Min weder Worker noch PR (Loop-Wächter, SIN-240, SIN-291).`);
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
