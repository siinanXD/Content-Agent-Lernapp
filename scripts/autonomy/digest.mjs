#!/usr/bin/env node
/**
 * Tages-Update aufs Handy (SIN-246): 10:00 (morgen) und 20:00 (abend), Europe/Berlin.
 *
 *   node scripts/autonomy/digest.mjs --slot morgen|abend [--dry-run] [--force] [--fixture datei.json]
 *
 * Schreibt einen kurzen Kommentar mit @siinanXD ins Issue „Loop-Status“ (Push über GitHub Mobile), optional
 * zusätzlich Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID). Der Merker steht als HTML-Kommentar im Text:
 * `<!-- digest: {"day":"2026-10-05","slot":"morgen","at":"…"} -->`. Gibt es für den Slot schon einen Kommentar
 * von vor weniger als 6 h, wird nichts erneut gesendet (SIN-267); `--force` überspringt das, sein Merker trägt
 * `force:true` und zählt weder für den Schutz noch als Beginn; der Merker des letzten Updates ist auch der Beginn von „seit dem letzten Update“.
 * Auswerten und Rendern sind reine Funktionen (`buildDigest`); nur `collect` und `main` sprechen mit dem Netz.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { collectContentMetrics } from "./content-metrics.mjs";
import { LANES, fetchProjectIssues, startOrder } from "./linear.mjs";
import { collectBackup } from "./backup.mjs";
import { assessReadiness, collectMetrics } from "./planner.mjs";
import { MENTION, STATUS_LABEL, buildQuotaRows, collectDecisions as collectOpenDecisions, collectUsage, gh } from "./status.mjs";

export const SLOTS = ["morgen", "abend"];
export const TZ = "Europe/Berlin";
export const MAX_ITEMS = 4;
export const QUOTA_MIN_PCT = 50;
/** Ohne früheres Update zählt das letzte halbe Tag. */
export const FALLBACK_SINCE_MS = 12 * 60 * 60 * 1000;
const MARK_RE = /<!-- digest: (\{.*?\}) -->/s;

export const GROUPS = ["Frontend", "Backend", "Content", "Infrastruktur"];
const INFRA_TYPES = ["ci", "chore", "build", "docs", "revert"];
const INFRA_SCOPES = ["autonomie", "ci", "infra", "workflow", "decisions", "deps"];
const FRONT_SCOPES = ["lernpfad", "ui", "app", "design", "a11y", "frontend", "lernen", "pruefung", "onboarding"];

const labelNames = (x) => (x.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
const trim = (s, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Berliner Kalendertag (JJJJ-MM-TT) eines Zeitpunkts. */
export const berlinDay = (date) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(date);

export function parseMark(body) {
  try {
    return MARK_RE.test(body ?? "") ? JSON.parse(body.match(MARK_RE)[1]) : null;
  } catch {
    return null;
  }
}

/** Merker; `force` (Testlauf) kennzeichnet ihn: er sperrt keinen Slot und verschiebt „seit dem letzten Update“ nicht. */
export const markOf = (day, slot, at, force = false) => `<!-- digest: ${JSON.stringify(force ? { day, slot, at, force: true } : { day, slot, at })} -->`;

/** Gleicher Slot wird nur innerhalb dieser Zeit unterdrückt (Wiederholungsschutz, SIN-267). */
export const REPEAT_GUARD_MS = 6 * 60 * 60 * 1000;

/** Letzter Merker (ohne Testläufe) und ob der Slot vor weniger als 6 h schon gesendet wurde. */
export function lastDigest(commentBodies, now, slot) {
  const marks = commentBodies.map(parseMark).filter((m) => m && !m.force);
  const last = [...marks].sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1) ?? null;
  const t = new Date(now).getTime();
  const already = marks.some((m) => {
    const age = t - new Date(m.at).getTime();
    return m.slot === slot && age >= 0 && age < REPEAT_GUARD_MS;
  });
  return { last, already };
}

/** Spur eines gemergten PRs aus dem Conventional-Commit-Titel: `feat(lernpfad): Text (SIN-1)`. */
export function groupOf(title) {
  const m = String(title).match(/^(\w+)(?:\(([^)]+)\))?!?:/);
  const type = m?.[1]?.toLowerCase();
  const scope = (m?.[2] ?? "").toLowerCase();
  if (scope.includes("content") || scope === "quellen") return "Content";
  if (INFRA_SCOPES.includes(scope)) return "Infrastruktur";
  if (FRONT_SCOPES.includes(scope)) return "Frontend";
  return INFRA_TYPES.includes(type) ? "Infrastruktur" : "Backend";
}

/** Eine Zeile Klartext: Titel ohne Typ und Kennung, Bereich vorangestellt, Kennung hinten. */
export function plainLine(title, group = "") {
  const m = String(title).match(/^\w+(?:\(([^)]+)\))?!?:\s*(.*?)\s*(?:\((SIN-\d+)\))?$/);
  if (!m) return trim(String(title));
  const [, scope, text, id] = m;
  const label = scope && scope.toLowerCase() !== group.toLowerCase() ? `${scope[0].toUpperCase()}${scope.slice(1)}: ` : "";
  return trim(`${label}${text}`) + (id ? ` (${id})` : "");
}

/** Ein Satz je Entscheidungsdatei: der Teil hinter „Entscheidung:“, sonst die Überschrift. */
export function decisionLine(name, text) {
  const id = name.replace(/^.*\//, "").replace(/\.md$/, "");
  const head = String(text).match(/^#\s*(.+)$/m)?.[1] ?? id;
  const dec = String(text).match(/\*\*Entscheidung:?\*\*:?\s*(.+)/)?.[1];
  const first = (dec ?? head).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`]/g, "");
  const sentence = first.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? first;
  return `${id.match(/^SIN-\d+/)?.[0] ?? id}: ${trim(sentence.replace(/^SIN-\d+\s*[—-]\s*/, ""), 100)}`;
}

/** „Braucht dich“: offene Entscheidungen, risk:high-PRs ohne Freigabe, needs-human (PR/Issue), Design-Pakete und Abnahme (Linear). */
/** Offene Punkte (`- [ ]`) der internen Rechts-Checkliste (SIN-301). */
export function openLegalItems(md) {
  return [...String(md).matchAll(/^- \[ \] (.+)$/gm)].map((m) => m[1].trim());
}

/** @param {{ openPrs?: any[], issues?: any[], decisions?: { number: number, title: string, question: string }[], legalOpen?: string[] }} snap */
export function needsYou({ openPrs = [], issues = [], decisions = [], legalOpen = [] }) {
  const out = [];
  if (legalOpen.length) out.push(`Recht: ${legalOpen.length} ${legalOpen.length === 1 ? "Punkt" : "Punkte"} offen vor dem Demo-Zugang (docs/legal/checkliste-demo-zugang.md), z. B. ${trim(legalOpen[0], 50)}`);
  // SIN-291: Entscheidungen in schon gemergten PRs, bis Sinan im PR antwortet.
  for (const d of decisions) out.push(`Entscheidung PR #${d.number}: ${trim(d.question, 70)}`);
  for (const p of openPrs) {
    const l = labelNames(p);
    if (l.includes("needs-human")) out.push(`Blocker PR #${p.number}: ${trim(p.title, 60)}`);
    else if (l.includes("risk:high") && !l.some((x) => ["freigegeben", "owner-approved"].includes(x))) out.push(`Freigabe PR #${p.number}: ${trim(p.title, 60)}`);
  }
  for (const i of issues) {
    const l = (i.labels?.nodes ?? []).map((x) => x.name.toLowerCase());
    if (l.includes("needs-human")) out.push(`Blocker ${i.identifier}: ${trim(i.title, 60)}`);
    else if (l.includes("design")) out.push(`Design ${i.identifier}: ${trim(i.title, 60)}`);
    else if (l.includes("abnahme")) out.push(`Abnahme ${i.identifier}: ${trim(i.title, 60)}`);
  }
  return out;
}

const more = (list, n) => (list.length > n ? [`… und ${list.length - n} weitere`] : []);

/**
 * Baut den Kommentartext (kurz, handytauglich). Alle Eingaben sind schon gelesen:
 * { now, slot, since, mergedPrs: [{ title, merged_at }], decisions: [{ name, text }], issues, openPrs,
 *   content: { einheitenNeuWoche, bestehensquote, kostenWocheEur } | null, quotas: buildQuotaRows-Zeilen,
 *   readiness: { green, total } | null }
 */
export function buildDigest(snap) {
  const now = new Date(snap.now);
  const day = berlinDay(now);
  const abend = snap.slot === "abend";
  const lines = [`${MENTION} **Update ${abend ? "20:00" : "10:00"}** · ${day}`];

  const merged = (snap.mergedPrs ?? []).filter((p) => !snap.since || p.merged_at > snap.since);
  lines.push("", "**Gebaut**");
  if (!merged.length) lines.push("- nichts Neues");
  for (const g of GROUPS) {
    const mine = merged.filter((p) => groupOf(p.title) === g);
    if (mine.length) lines.push(`- ${g}: ${mine.slice(0, 3).map((p) => plainLine(p.title, g)).join(" · ")}${mine.length > 3 ? ` · +${mine.length - 3}` : ""}`);
  }

  const decisions = snap.decisions ?? [];
  if (decisions.length) lines.push("", "**Entscheidungen**", ...decisions.slice(0, MAX_ITEMS).map((d) => `- ${decisionLine(d.name, d.text)}`), ...more(decisions, MAX_ITEMS));

  const queue = startOrder(snap.issues ?? []).slice(0, MAX_ITEMS);
  const laneOf = (i) => LANES.find((l) => (i.labels?.nodes ?? []).some((x) => x.name.toLowerCase() === l)) ?? "backend";
  lines.push("", `**${abend ? "Über Nacht geplant" : "Heute geplant"}**`);
  lines.push(...(queue.length ? queue.map((i) => `- ${i.identifier} ${trim(i.title, 70)} (${laneOf(i)})`) : ["- nichts in der Schlange"]));

  const need = needsYou({ ...snap, decisions: snap.decisionsOpen });
  lines.push("", "**Braucht dich**", ...(need.length ? [...need.slice(0, MAX_ITEMS).map((n) => `- ${n}`), ...more(need, MAX_ITEMS)] : ["Nichts zu tun."]));

  const c = snap.content;
  const kpi = c
    ? `Content: ${c.einheitenNeuWoche ?? 0} neue Einheiten, Bestehensquote ${c.bestehensquote == null ? "nicht verfügbar" : `${c.bestehensquote} %`}, Kosten Fabrik ${Number(c.kostenWocheEur ?? 0).toFixed(2)} € (je 7 Tage)`
    : "Content: nicht verfügbar";
  const high = (snap.quotas ?? []).filter((q) => q.pct != null && q.pct > QUOTA_MIN_PCT);
  lines.push("", "**Kennzahlen**", `- ${kpi}`, `- Kontingente über ${QUOTA_MIN_PCT} %: ${high.length ? high.map((q) => `${q.name} ${q.pct} %`).join(", ") : "keine"}`);

  const r = snap.readiness;
  const b = snap.backup;
  lines.push("", `Sicherung: ${b ? (b.ok ? b.line.replace("Letzte Sicherung ", "zuletzt ") : `⚠️ ${b.line}`) : "nicht verfügbar"}`);
  lines.push("", r ? `Phase: ${r.green === r.total ? "beobachten" : "bauen"} · Produktreife ${r.green} von ${r.total} Punkten` : "Phase und Produktreife: nicht verfügbar");
  lines.push("", markOf(day, snap.slot, snap.now, snap.force));
  return { text: lines.join("\n"), day };
}

// ---------- Netz ----------

/** Neue Entscheidungsdateien seit `since` aus der Git-Historie (Checkout mit fetch-depth 0). */
export function collectDecisions(since, run = execFileSync) {
  const out = String(run("git", ["log", `--since=${since}`, "--diff-filter=A", "--name-only", "--format=", "origin/main", "--", "docs/decisions"], { encoding: "utf8" }));
  const names = [...new Set(out.split("\n").filter((f) => /^docs\/decisions\/SIN-.*\.md$/.test(f)))];
  return names.flatMap((name) => {
    try {
      return [{ name, text: readFileSync(name, "utf8") }];
    } catch {
      return [];
    }
  });
}

async function collect(repo, slot, now, since, env) {
  const prs = await gh(`/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100`);
  const mergedPrs = prs.filter((p) => p.merged_at && (!since || p.merged_at > since)).map((p) => ({ title: p.title, merged_at: p.merged_at }));
  const openPrs = prs.filter((p) => p.state === "open").map((p) => ({ number: p.number, title: p.title, labels: p.labels.map((l) => l.name) }));
  let issues = [];
  try {
    issues = await fetchProjectIssues();
  } catch (e) {
    console.log(`Linear nicht lesbar: ${e.message}`);
  }
  let content = null;
  let readiness = null;
  try {
    const m = await collectContentMetrics(env);
    const total = m.passRates.reduce((s, p) => s + p.total, 0);
    const passed = m.passRates.reduce((s, p) => s + (p.pct / 100) * p.total, 0);
    content = { einheitenNeuWoche: m.runs.einheitenNeuWoche, bestehensquote: total ? Math.round((passed / total) * 100) : null, kostenWocheEur: m.runs.kostenWocheEur };
    const { rows } = await assessReadiness({ metrics: await collectMetrics(env), issues, env });
    readiness = { green: rows.filter((r) => r.status === "ok").length, total: rows.length };
  } catch (e) {
    console.log(`Kennzahlen nicht lesbar: ${e.message}`);
  }
  const limits = JSON.parse(readFileSync(new URL("../../docs/autonomy/free-tier-limits.json", import.meta.url), "utf8"));
  const quotas = buildQuotaRows(await collectUsage({ env, now }), limits);
  let decisions = [];
  try {
    decisions = collectDecisions(since ?? new Date(now.getTime() - FALLBACK_SINCE_MS).toISOString());
  } catch (e) {
    console.log(`Entscheidungen nicht lesbar: ${e.message}`);
  }
  const decisionsOpen = await collectOpenDecisions(repo, prs.map((p) => ({ ...p, labels: p.labels.map((l) => l.name) })), now).catch(() => []);
  let legalOpen = [];
  try {
    legalOpen = openLegalItems(readFileSync(new URL("../../docs/legal/checkliste-demo-zugang.md", import.meta.url), "utf8"));
  } catch (e) {
    console.log(`Rechts-Checkliste nicht lesbar: ${e.message}`);
  }
  const backup = await collectBackup(repo, now, gh);
  return { now: now.toISOString(), slot, since, mergedPrs, openPrs, issues, decisions, decisionsOpen, legalOpen, content, quotas, readiness, backup };
}

export async function sendTelegram(text, env, fetchImpl = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const plain = text.replace(/<!--.*?-->/gs, "").replace(/\*\*/g, "").replace(MENTION, "").trim();
  const res = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: plain }),
  });
  if (!res.ok) throw new Error(`Telegram: ${res.status}`);
  return true;
}

export async function main(argv, env = process.env) {
  const arg = (n) => argv[argv.indexOf(n) + 1];
  const slot = arg("--slot");
  if (!SLOTS.includes(slot)) throw new Error(`--slot morgen|abend nötig, bekommen: ${slot}`);
  const dry = argv.includes("--dry-run");
  if (argv.includes("--fixture")) {
    const { text } = buildDigest({ ...JSON.parse(readFileSync(arg("--fixture"), "utf8")), slot });
    console.log(text);
    return text;
  }
  const repo = env.GITHUB_REPOSITORY;
  if (!repo || !env.GITHUB_TOKEN) throw new Error("GITHUB_REPOSITORY und GITHUB_TOKEN nötig (oder --fixture)");
  const now = new Date();
  const found = await gh(`/repos/${repo}/issues?labels=${STATUS_LABEL}&state=open&per_page=1`);
  if (!found[0]) throw new Error(`Issue mit Label ${STATUS_LABEL} nicht gefunden`);
  const comments = await gh(`/repos/${repo}/issues/${found[0].number}/comments?per_page=100&sort=created&direction=desc`);
  const force = argv.includes("--force");
  const { last, already } = lastDigest(comments.map((c) => c.body), now, slot);
  if (already && !force) {
    console.log(`Update ${slot} wurde vor weniger als 6 h schon gesendet, übersprungen.`);
    return null;
  }
  const { text } = buildDigest({ ...(await collect(repo, slot, now, last?.at ?? null, env)), force });
  console.log(text);
  if (dry) return text;
  // Erst der Kommentar (trägt den Merker), dann Telegram: ein Fehler dort wiederholt das Update nicht.
  await gh(`/repos/${repo}/issues/${found[0].number}/comments`, { method: "POST", body: { body: text } });
  try {
    await sendTelegram(text, env);
  } catch (e) {
    console.log(`::warning::${e.message}`);
  }
  return text;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
