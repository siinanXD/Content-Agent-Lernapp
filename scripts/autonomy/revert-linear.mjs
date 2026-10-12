#!/usr/bin/env node
/**
 * Zurückgenommenes Issue wieder öffnen (SIN-492). Nimmt revert-guard einen Commit auf main zurück (SIN-252, SIN-319),
 * bleibt das Linear-Issue des Originals auf „Done“ und zählt als erledigt, obwohl nichts davon auf main ist.
 * Dieser Lauf läuft nach jedem CI-Lauf auf main (Job `linear` in revert-guard.yml) und tut nur etwas, wenn der
 * Commit der gemergte Revert-PR von revert-guard ist:
 *   - erstes Mal: Issue auf „Todo“ (der Dispatcher nimmt es wieder auf), Kommentar mit Revert-PR, Original-PR und rotem Lauf
 *   - zweites Mal: Label `needs-human` statt erneut in die Schlange, Status bleibt
 *
 *   node scripts/autonomy/revert-linear.mjs --sha <Commit auf main> [--dry-run] [--fixture <json>]
 *
 * Nie fatal (Exit 0): fehlt ein Secret oder ist eine API nicht erreichbar, steht nur eine Warnung im Log.
 * Braucht AGENT_WORKFLOW_TOKEN (GH_TOKEN), LINEAR_API_KEY und für das Ereignis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.
 * --fixture liest die gesammelten GitHub- und Linear-Daten aus einer Datei (Trockenlauf ohne Netz).
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildEvent, sendEvent } from "./leitstand.mjs";
import { fetchJson } from "./http.mjs";
import { addLabel, comment, linear, setState } from "./linear.mjs";

/** Anfang jedes Kommentars dieses Laufs; daran zählt er die Rücknahmen (Kommentare sind die Quelle). */
export const KOMMENTAR_PRAEFIX = "revert-guard: zurückgenommen";
export const ZIEL_STATUS = "Todo";
export const ZWEITE_RUECKNAHME_LABEL = "needs-human";

/** Linear-Kennung aus dem Titel des Revert-PRs: die letzte, wie in revert-guard (`tail -1`). */
export function issueOfTitle(title) {
  const ids = String(title ?? "").match(/SIN-\d+/g);
  return ids ? ids[ids.length - 1] : null;
}

/** Original-SHA aus dem Commit-Text des Reverts („Revert von <sha>, weil …“). */
export function originalShaOf(text) {
  return String(text ?? "").match(/Revert von ([0-9a-f]{40})\b/)?.[1] ?? null;
}

/** Roter Lauf aus dem Text des Revert-PRs („Fehlgeschlagener Lauf: <URL>“). */
export function roterLaufOf(body) {
  return String(body ?? "").match(/Fehlgeschlagener Lauf: (\S+)/)?.[1] ?? null;
}

/** Gemergter PR von revert-guard (Branch `claude/revert-<sha7>`). */
export function isRevertPr(pr) {
  return Boolean(pr?.merged_at) && String(pr.head?.ref ?? "").startsWith("claude/revert-");
}

/** Wie oft dieses Issue schon per Revert zurückkam (Kommentare dieses Laufs). */
export function countRuecknahmen(kommentare) {
  return kommentare.filter((k) => String(k ?? "").startsWith(KOMMENTAR_PRAEFIX)).length;
}

const link = (pr) => `[#${pr.number}](${pr.html_url})`;

/**
 * Reine Entscheidung aus den gesammelten Daten. Null, wenn der Commit kein gemergter Revert-PR von revert-guard ist
 * oder das Issue nicht gefunden wurde. Liefert sonst den Plan (Status, Label, Kommentar, Ereignis) ohne Netzaufruf.
 * @param {{ revertPulls?: object[], revertCommits?: { commit: { message: string } }[], originalPulls?: object[], issue?: { id: string, identifier: string, team: { id: string }, comments?: { nodes?: { body: string }[] } | { body: string }[] } | null }} d
 */
export function planFromData(d) {
  const revertPr = (d.revertPulls ?? []).find(isRevertPr);
  if (!revertPr) return null;
  const issueId = issueOfTitle(revertPr.title);
  if (!issueId || !d.issue) return null;

  const kommentare = (Array.isArray(d.issue.comments) ? d.issue.comments : d.issue.comments?.nodes ?? []).map((k) => k.body);
  // Idempotent: der zweite CI-Lauf auf demselben Revert-Commit findet seinen Kommentar schon.
  if (kommentare.some((k) => String(k ?? "").includes(`Revert-PR ${link(revertPr)}`))) return { schon: true, issue: issueId };

  const originalSha = originalShaOf((d.revertCommits ?? []).map((c) => c.commit?.message ?? "").join("\n"));
  const originalPr = (d.originalPulls ?? []).find((p) => p.merged_at) ?? null;
  const zweite = countRuecknahmen(kommentare) >= 1;
  const roterLauf = roterLaufOf(revertPr.body);

  const zeilen = [
    `${KOMMENTAR_PRAEFIX}: Revert-PR ${link(revertPr)} ist gemergt.`,
    originalPr
      ? `Original: ${link(originalPr)}${originalSha ? ` (\`${originalSha.slice(0, 7)}\`)` : ""}.`
      : `Original: ${originalSha ? `\`${originalSha.slice(0, 7)}\`` : "nicht ermittelt"}.`,
    `Roter Lauf: ${roterLauf ?? "nicht lesbar"}.`,
    zweite
      ? `Zum zweiten Mal zurückgenommen: Label \`${ZWEITE_RUECKNAHME_LABEL}\` statt erneut in die Schlange. Bitte von Hand prüfen.`
      : `Issue steht wieder auf ${ZIEL_STATUS} und geht in die Schlange.`,
  ];

  return {
    schon: false,
    issue: d.issue.identifier ?? issueId,
    issueRef: d.issue,
    pr: revertPr.number,
    // Zweites Mal: Status bleibt, sonst wieder Todo.
    status: zweite ? null : ZIEL_STATUS,
    label: zweite ? ZWEITE_RUECKNAHME_LABEL : null,
    kommentar: zeilen.join("\n\n"),
  };
}

/** Text des Trockenlaufs: die geplante Linear-Änderung, nichts wird ausgeführt. */
export function describePlan(plan) {
  if (plan.schon) return `[dry-run] ${plan.issue}: Revert-PR schon kommentiert, nichts zu tun`;
  return [
    `[dry-run] ${plan.issue}`,
    `  Status: ${plan.status ?? "unverändert (zweite Rücknahme)"}`,
    `  Label: ${plan.label ?? "keins"}`,
    `  Kommentar:\n${plan.kommentar.split("\n").map((l) => `    ${l}`).join("\n")}`,
    `  Ereignis: REVERT ok, Agent pruefen, PR #${plan.pr}`,
  ].join("\n");
}

const GH_API = "https://api.github.com";
const ISSUE_QUERY = `query($id: String!) { issue(id: $id) { id identifier team { id } comments(first: 50) { nodes { body } } } }`;

/** Holt die Daten für den Commit von GitHub und Linear; nur lesend. */
export async function fetchData(sha, env = process.env, http = {}, call = linear) {
  const repo = env.GITHUB_REPOSITORY;
  const gh = (path) =>
    fetchJson("GitHub", `${GH_API}/repos/${repo}${path}`, {
      headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    }, http);
  const revertPulls = await gh(`/commits/${sha}/pulls`);
  const revertPr = revertPulls.find(isRevertPr);
  if (!revertPr) return { revertPulls };
  const revertCommits = await gh(`/pulls/${revertPr.number}/commits`);
  const originalSha = originalShaOf(revertCommits.map((c) => c.commit?.message ?? "").join("\n"));
  const originalPulls = originalSha ? await gh(`/commits/${originalSha}/pulls`) : [];
  const id = issueOfTitle(revertPr.title);
  const data = id ? await call(ISSUE_QUERY, { id }) : null;
  return { revertPulls, revertCommits, originalPulls, issue: data?.issue ?? null };
}

/** Führt den Plan in Linear aus und schreibt das Ereignis. Fehler sind nie fatal. */
export async function apply(plan, env = process.env, http = {}, call = linear) {
  const issue = plan.issueRef;
  let status = "ok";
  try {
    await comment(issue.id, plan.kommentar, call);
    if (plan.status) await setState(issue, plan.status, call);
    if (plan.label) await addLabel(issue, plan.label, call);
  } catch (e) {
    status = "fehler";
    console.log(`::warning::Revert-Linear: ${plan.issue} nicht geändert (${e.message})`);
  }
  const event = buildEvent({ schritt: "REVERT", status, issue: plan.issue, pr: plan.pr }, env);
  const r = await sendEvent(event, env, http);
  if (!r.ok) console.log(`::warning::Leitstand: Ereignis REVERT nicht gespeichert (${r.grund})`);
  console.log(`Revert-Linear: ${plan.issue} ${status === "ok" ? "aktualisiert" : "fehlgeschlagen"}`);
}

export async function main(argv = process.argv.slice(2), env = process.env, http = {}, call = linear) {
  const arg = (n, d = "") => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const dry = argv.includes("--dry-run");
  try {
    const sha = arg("--sha") || env.SHA || "";
    if (!/^[0-9a-f]{40}$/.test(sha)) {
      console.log("::warning::Revert-Linear: --sha mit dem vollen Commit-SHA fehlt");
      return;
    }
    const fixture = arg("--fixture");
    const data = fixture ? JSON.parse(readFileSync(fixture, "utf8")) : await fetchData(sha, env, http, call);
    const plan = planFromData(data);
    if (!plan) {
      console.log(`Revert-Linear: ${sha.slice(0, 7)} ist kein gemergter Revert-PR von revert-guard, nichts zu tun.`);
      return;
    }
    if (plan.schon) return console.log(describePlan(plan));
    if (dry) return console.log(describePlan(plan));
    if (!env.LINEAR_API_KEY) {
      console.log("::warning::Revert-Linear: LINEAR_API_KEY fehlt, Issue nicht geändert.");
      return;
    }
    await apply(plan, env, http, call);
  } catch (e) {
    console.log(`::warning::Revert-Linear: ${e.message}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
