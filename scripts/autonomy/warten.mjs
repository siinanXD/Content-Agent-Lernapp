/**
 * Wartende PRs und Gate-Bruch (SIN-327). Alles Auswerten ist reine Funktion; nur `collectPrStates` und
 * `collectGateFailures` sprechen mit GitHub.
 *
 * - Wartender PR: kein Worker läuft, PR offen, und der Loop kann allein nichts mehr tun (CI rot nach der letzten
 *   Reparatur-Runde, Merge-Konflikt, `risk:high` ohne Freigabe). Sein Issue belegt dann keinen Platz im Dispatcher.
 * - Gate-Bruch: derselbe Check scheitert im selben Schritt in 2 oder mehr offenen PRs mit unterschiedlichem Code →
 *   die Ursache liegt auf `main`, ein Urgent-Bug-Issue statt Reparatur in jedem PR.
 */
import { prMentions } from "./linear.mjs";

/** Label, das die automatische Reparatur eines PR sperrt, solange das Gate-Bug-Issue offen ist (repair.yml prüft es). */
export const GATE_LABEL = "gate-bruch";
export const GATE_PREFIX = "Bug: Gate-Bruch auf main:";
const APPROVAL = ["freigegeben", "approved"];
const MIN_PRS = 2;

const names = (p) => (p.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));

/**
 * Warum ein offener PR wartet (Text) oder null. `ci` ist der Stand des Checks `build` ("failure" | "success" | …).
 * Rote CI zählt erst als Wartezustand, wenn die Reparatur am Ende ist (repair:3 oder needs-human) oder gesperrt wurde.
 */
export function waitReason(pr) {
  if (pr.state !== "open" || pr.draft) return null;
  const l = names(pr);
  if (pr.mergeable_state === "dirty") return "Merge-Konflikt";
  if (l.includes("risk:high") && !APPROVAL.some((a) => l.includes(a))) return "wartet auf Freigabe (risk:high)";
  if (pr.ci === "failure" && (l.includes("repair:3") || l.includes("needs-human"))) return "CI rot, Reparatur ausgeschöpft";
  if (pr.ci === "failure" && l.includes(GATE_LABEL)) return "CI rot, Gate-Bruch auf main";
  return null;
}

/**
 * Issues in „In Progress“, die keinen Platz belegen: kein Worker läuft und alle offenen PRs des Issues warten.
 * @returns {Map<string, { pr: number, reason: string }>} Kennung → Grund
 */
export function waitingIssues(issues, prs, runningWorkers = []) {
  const out = new Map();
  for (const issue of issues) {
    if (issue.state?.type !== "started" || runningWorkers.includes(issue.identifier)) continue;
    const mine = prs.filter((p) => p.state === "open" && prMentions(p, issue.identifier));
    if (!mine.length) continue;
    const reasons = mine.map((p) => ({ pr: p.number, reason: waitReason(p) }));
    if (reasons.every((r) => r.reason)) out.set(issue.identifier, reasons[0]);
  }
  return out;
}

/**
 * Gate-Bruch erkennen.
 * SIN-333: Es zählen nur frische Läufe (gestartet nach dem letzten Merge auf main), nie Dependabot-PRs, und nur
 * Checks, die auf main selbst nicht grün sind. Ist der Check auf main grün, landen die PRs in `rerun` (neu anstoßen).
 * @param {{ number: number, sha: string, author?: string, startedAt?: string, failures: { check: string, step: string, lines?: string }[] }[]} prs offene PRs mit ihren roten Schritten
 * @param {{ title: string }[]} known offene und kürzlich erledigte Issues (Duplikat-Schutz)
 * @param {{ mainSince?: string, main?: Record<string, string | null> }} ctx letzter Merge auf main (ISO) und Stand der Checks auf main
 * @returns {{ breaks: { check: string, step: string, prs: number[], lines: string, title: string, issue: object | null }[], rerun: number[] }}
 *   `issue` ist null, wenn es das Bug-Issue schon gibt.
 */
export function detectGateBreaks(prs, known = [], ctx = {}) {
  const groups = new Map();
  const since = ctx.mainSince ? Date.parse(ctx.mainSince) : NaN;
  for (const p of prs) {
    if (String(p.author ?? "").toLowerCase().startsWith("dependabot")) continue;
    if (!Number.isNaN(since) && p.startedAt && Date.parse(p.startedAt) < since) continue;
    for (const f of p.failures ?? []) {
      const key = `${f.check} / ${f.step}`;
      const g = groups.get(key) ?? { check: f.check, step: f.step, prs: new Map(), lines: "" };
      g.prs.set(p.number, p.sha);
      g.lines ||= f.lines ?? "";
      groups.set(key, g);
    }
  }
  const breaks = [];
  const rerun = new Set();
  for (const [key, g] of groups) {
    // Unterschiedlicher Code: mindestens 2 PRs mit verschiedenem Commit.
    if (g.prs.size < MIN_PRS || new Set(g.prs.values()).size < MIN_PRS) continue;
    // Auf main grün: kein Gate-Bruch, die PRs sind veraltet und laufen neu.
    if (ctx.main?.[g.check] === "success") {
      for (const n of g.prs.keys()) rerun.add(n);
      continue;
    }
    const title = `${GATE_PREFIX} ${key}`;
    const numbers = [...g.prs.keys()].sort((a, b) => a - b);
    const taken = known.some((k) => String(k.title).trim().toLowerCase() === title.toLowerCase());
    breaks.push({
      check: g.check,
      step: g.step,
      prs: numbers,
      lines: g.lines,
      title,
      issue: taken
        ? null
        : {
            lane: "backend",
            priority: 1,
            labels: ["claude", "Bug"],
            title,
            description: [
              `Der Check \`${g.check}\` scheitert im Schritt \`${g.step}\` in ${numbers.length} offenen PRs mit unterschiedlichem Code (${numbers.map((n) => `#${n}`).join(", ")}). Die Ursache liegt wahrscheinlich auf \`main\` (SIN-327).`,
              "",
              `Fehlerzeilen: ${g.lines || "nicht lesbar, siehe Check-Lauf"}`,
              "",
              "Bitte das Gate auf `main` reparieren (nicht die PRs). Die betroffenen PRs werden bis zum Merge nicht repariert (Label `gate-bruch`), danach wird `main` automatisch eingemergt.",
            ].join("\n"),
          },
    });
  }
  return { breaks, rerun: [...rerun].sort((a, b) => a - b) };
}

/**
 * Aktionen für PRs: Reparatur sperren, solange ein Gate-Bug offen ist; danach entsperren und `main` einmergen.
 * @param {{ number: number, labels: unknown[], state: string }[]} openPrs
 * @param {{ prs: number[] }[]} breaks aktuell erkannte Brüche
 * @param {boolean} bugOpen gibt es ein offenes Gate-Bug-Issue (Titelpräfix)?
 * @param {number[]} rerun PRs mit veraltetem Rot (Check auf main grün): main einmergen, CI läuft neu (SIN-333)
 * @returns {{ type: "gate-block" | "gate-release" | "gate-rerun", pr: number }[]}
 */
export function gateActions(openPrs, breaks, bugOpen, rerun = []) {
  const actions = [];
  for (const n of rerun) if (openPrs.some((x) => x.number === n && x.state === "open" && !names(x).includes(GATE_LABEL))) actions.push({ type: "gate-rerun", pr: n });
  const hit = new Set(breaks.flatMap((b) => b.prs));
  for (const p of openPrs.filter((x) => x.state === "open")) {
    const marked = names(p).includes(GATE_LABEL);
    if (hit.has(p.number) && !marked) actions.push({ type: "gate-block", pr: p.number });
    else if (marked && !bugOpen && !hit.has(p.number)) actions.push({ type: "gate-release", pr: p.number });
  }
  return actions;
}

// ---------- Netz ----------

const GH = "https://api.github.com";

async function get(path, token, fetchImpl = fetch) {
  const res = await fetchImpl(`${GH}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status}`);
  return res.json();
}

/**
 * Offene PRs mit Labels, Merge-Stand und CI-Stand (Check `build`), für den Dispatcher.
 * `checkRuns` bleibt für `collectGateFailures` dran.
 */
export async function collectPrStates(repo, token, fetchImpl = fetch) {
  const list = await get(`/repos/${repo}/pulls?state=open&per_page=100`, token, fetchImpl);
  const out = [];
  for (const p of list) {
    const pr = { number: p.number, title: p.title, head: p.head?.ref, state: p.state, draft: p.draft, labels: p.labels.map((l) => l.name), sha: p.head.sha };
    pr.author = p.user?.login;
    pr.mergeable_state = (await get(`/repos/${repo}/pulls/${p.number}`, token, fetchImpl)).mergeable_state;
    const cr = await get(`/repos/${repo}/commits/${p.head.sha}/check-runs?per_page=100`, token, fetchImpl);
    pr.ci = cr.check_runs.find((c) => c.name === "build")?.conclusion ?? undefined;
    pr.checkRuns = cr.check_runs;
    out.push(pr);
  }
  return out;
}

/** Rote Schritte je PR (Check, Schritt, erste Fehlerzeile) für `detectGateBreaks`. */
export async function collectGateFailures(repo, token, prs, fetchImpl = fetch) {
  const out = [];
  for (const p of prs) {
    const failures = [];
    for (const c of (p.checkRuns ?? []).filter((x) => x.conclusion === "failure")) {
      try {
        const job = await get(`/repos/${repo}/actions/jobs/${c.id}`, token, fetchImpl);
        const step = job.steps?.find((s) => s.conclusion === "failure");
        if (!step) continue;
        let lines = "";
        try {
          const notes = await get(`/repos/${repo}/check-runs/${c.id}/annotations`, token, fetchImpl);
          lines = String((notes.find((n) => n.annotation_level === "failure") ?? notes[0])?.message ?? "").replace(/\s+/g, " ").slice(0, 200);
        } catch {
          /* ohne Zeilen bleibt der Schritt */
        }
        failures.push({ check: c.name, step: step.name, lines });
      } catch {
        /* Job nicht lesbar: kein Beitrag zum Gate-Bruch */
      }
    }
    const starts = (p.checkRuns ?? []).filter((x) => x.conclusion === "failure" && x.started_at).map((x) => x.started_at).sort();
    out.push({ number: p.number, sha: p.sha, author: p.author, startedAt: starts.at(-1), failures });
  }
  return out;
}

/** Stand der Checks auf main (letzter Lauf je Name), für den Gegencheck vor dem Anlegen (SIN-333). */
export async function collectMainChecks(repo, token, fetchImpl = fetch) {
  const cr = await get(`/repos/${repo}/commits/main/check-runs?per_page=100`, token, fetchImpl);
  const out = {};
  for (const c of [...cr.check_runs].sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)))) out[c.name] = c.conclusion ?? null;
  return out;
}
