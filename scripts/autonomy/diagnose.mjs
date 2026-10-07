/**
 * Selbst-Diagnose des Loops (SIN-291). Reine Funktionen ohne Netz:
 *   - Ursache eines Stillstands aus den letzten Logs bestimmen und das Bug-Issue dafür bauen,
 *   - Grund eines Worker-Laufs ohne PR aus der Execution-Datei lesen,
 *   - Linear-Kontingent (Issue-Zahl gegen Limit) bewerten,
 *   - offene Entscheidungen in schon gemergten PRs finden.
 * Das Anlegen in Linear und das Lesen der Logs liegen in status.mjs und dispatch.mjs.
 */
import { parseBody } from "./steckbrief.mjs";

/** Ab so vielen Minuten ohne Worker trotz startbarer Arbeit gilt der Loop als still. */
export const STALL_MIN = 30;
/** Linear Free: 250 aktive Issues (https://linear.app/pricing). Hinweis ab 85 %, Planer stoppt ab 95 %. */
export const LINEAR_ISSUE_LIMIT = 250;
export const LINEAR_WARN_PCT = 85;
export const LINEAR_STOP_PCT = 95;
/** So lange zeigt „Braucht dich“ eine Entscheidung aus einem gemergten PR höchstens an. */
export const DECISION_DAYS = 14;
export const STALL_PREFIX = "Stillstand:";
export const QUOTA_PREFIX = "Linear-Kontingent:";
/** Workflows, deren Logs für die Diagnose zählen. */
export const DIAG_WORKFLOWS = ["planner", "dispatch", "worker"];

/**
 * Ursachen in der Reihenfolge der Prüfung: das Spezifischere zuerst. `fix` ist der Hinweis im Bug-Issue.
 * Muster stammen aus echten Vorfällen vom 06.10. (Planer-Absturz, Vercel-Regel, Linear-Limit) und dem Claude-Limit.
 */
export const CAUSES = [
  {
    key: "linear-limit",
    label: "Linear-Issue-Limit erreicht",
    re: /issue limit|usage limit exceeded|LIMIT_EXCEEDED|reached the (?:maximum|max)[^.\n]{0,40}issues|free (?:plan|workspace)[^.\n]{0,40}limit|too many issues/i,
    fix: "Erledigte Issues archivieren oder abgebrochene löschen; der Planer legt bis dahin nichts an. Quelle: Linear → Settings → Billing.",
  },
  {
    key: "absturz",
    label: "Skript abgestürzt (z. B. Fehlerseite statt JSON)",
    re: /Unexpected token|is not valid JSON|keine JSON-Antwort|JSON\.parse|SyntaxError|TypeError|ReferenceError|Cannot read propert|ERR_[A-Z_]+|Unhandled(?:Promise)?Rejection|node:internal/i,
    fix: "Stacktrace im Log-Auszug lesen, die Stelle im Skript beheben (Antwort prüfen, bevor sie geparst wird, siehe SIN-263), Test mit der Fehlerantwort als Fixture ergänzen.",
  },
  {
    key: "regel",
    label: "Regel blockiert die Planung (z. B. Vercel)",
    re: /vercel[^\n]{0,120}(?:blocked|limit|rate|deployments?|rule|ruleset)|(?:blocked|denied|forbidden|rejected)[^\n]{0,80}(?:by|due to)[^\n]{0,40}(?:rule|ruleset|branch protection|policy)|Resource is limited|api-deployments-free|GH006|protected branch|Repository rule violations/i,
    fix: "Regel oder Schutz benennen, die den Lauf blockiert, und den Loop so anpassen, dass er sie einhält (z. B. Deploys bündeln, SIN-266), nicht umgehen.",
  },
  {
    key: "kontingent",
    label: "Claude-Kontingent oder Rate-Limit",
    re: /usage limit reached|hit your (?:usage )?limit|limit reached|rate[_ -]?limit|"status":\s*429|too many requests|HTTP 429|quota/i,
    fix: "Prüfen, ob AGENT_PAUSED_UNTIL gesetzt ist und der Reset-Zeitpunkt stimmt; sonst Takt oder Parallelität senken.",
  },
  {
    // Letzter Platz: kommt aus collectLogs, wenn kein Lauf rot war (SIN-328).
    key: "ohne-start",
    label: "Läufe ohne Fehler, aber kein Worker gestartet",
    re: /Kein roter Lauf:/,
    fix: "Dispatcher prüfen: Zeitplan (dispatch.yml) läuft, startbare Issues werden erkannt und der Worker wird ausgelöst (Blocker, Slots, Label `claude`, Pause). Schritt-Ausgabe des letzten dispatch-Laufs lesen und die Stelle beheben, die den Start verhindert.",
  },
];

/** Ursache aus einem Log-Auszug; `unbekannt`, wenn kein Muster passt. */
export function classifyLog(text) {
  const s = String(text ?? "");
  const hit = CAUSES.find((c) => c.re.test(s));
  return hit ? { key: hit.key, label: hit.label, fix: hit.fix } : { key: "unbekannt", label: "Ursache nicht erkennbar", fix: "Logs der letzten Läufe lesen und die Ursache benennen." };
}

const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Letzte Zeilen, die Fehler zeigen (sonst die letzten Zeilen); höchstens `max` Zeilen, je 200 Zeichen. */
export function logExcerpt(text, max = 8) {
  const lines = String(text ?? "").split("\n").map(oneLine).filter(Boolean);
  const bad = lines.filter((l) => /error|fehler|fail|limit|unexpected|denied|blocked|exception|rule/i.test(l));
  return (bad.length ? bad : lines).slice(-max).map((l) => l.slice(0, 200)).join("\n");
}

/**
 * Wertet einen Stillstand aus.
 * @param {{ running: number, paused: boolean, startable: number, idleMin: number, logs?: { workflow: string, runId?: number | string, url?: string, text: string }[] }} input
 *   `logs`: Logs der letzten fehlgeschlagenen (oder auffälligen) Läufe von planner, dispatch, worker, neueste zuerst.
 * @returns {null | { cause: string, label: string, fix: string, workflow: string | null, url: string | null, excerpt: string, reason: string }}
 *   null = kein Stillstand (oder nur die Pause, die schon gemeldet wird).
 */
export function diagnoseStall({ running, paused, startable, idleMin, logs = [] }) {
  if (running > 0 || paused) return null;
  const idle = startable > 0 && idleMin > STALL_MIN;
  const empty = startable === 0;
  if (!idle && !empty) return null;
  let found = null;
  for (const l of logs) {
    const c = classifyLog(l.text);
    // „Ohne Start“ ist nur bei startbarer Arbeit ein Fehler; leere Schlange ist normal.
    if (c.key !== "unbekannt" && !(c.key === "ohne-start" && !idle)) {
      found = { ...c, workflow: l.workflow, url: l.url ?? null, excerpt: logExcerpt(l.text) };
      break;
    }
  }
  // Leere Schlange ohne erkennbare Ursache ist normal (Betrieb, Wochenplan); nur ein Stillstand mit Arbeit meldet sich.
  if (!found && idle) {
    const last = logs[0];
    found = { ...classifyLog(""), workflow: last?.workflow ?? null, url: last?.url ?? null, excerpt: last ? logExcerpt(last.text) : "Keine Logs der letzten Läufe." };
  }
  if (!found) return null;
  const reason = idle
    ? `Kein Worker läuft seit ${Math.round(idleMin)} Min, obwohl ${startable} startbare Issues da sind.`
    : "Kein Worker läuft und die Schlange ist leer.";
  return { cause: found.key, label: found.label, fix: found.fix, workflow: found.workflow, url: found.url, excerpt: found.excerpt, reason };
}

/** Bug-Issue (Labels `claude`, `Bug`, Priorität dringend) für eine Diagnose. Titel nennt nur die Ursache: ein offenes Issue je Ursache. */
export function stallIssue(d) {
  return {
    lane: "backend",
    priority: 1,
    labels: ["claude", "Bug"],
    title: `${STALL_PREFIX} ${d.label}`,
    description: [
      `Der Wächter (SIN-291) hat einen Stillstand erkannt und die Ursache aus den Logs bestimmt: **${d.label}** (\`${d.cause}\`).`,
      "",
      d.reason,
      d.workflow ? `\nQuelle: Lauf von \`${d.workflow}\`${d.url ? ` (${d.url})` : ""}.` : "",
      "",
      "## Log-Auszug",
      "```",
      d.excerpt || "(leer)",
      "```",
      "",
      "## Akzeptanzkriterien",
      `- [ ] Ursache behoben: ${d.fix}`,
      "- [ ] Fixture-Test mit dem Log-Auszug ergänzt (Ursache → richtiges Bug-Issue)",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  };
}

const norm = (t) => String(t ?? "").trim().toLowerCase();

/** Kein Duplikat: Gibt es schon ein offenes Issue mit gleichem Titel (oder gleicher Ursache), entfällt das neue. */
export function newStallIssue(diagnosis, openIssues = []) {
  if (!diagnosis) return null;
  const issue = stallIssue(diagnosis);
  const taken = openIssues.some((i) => norm(i.title) === norm(issue.title));
  return taken ? null : issue;
}

// ---------- Worker ohne PR ----------

/**
 * Liest die Execution-Datei der Action (JSON-Array der Sitzung) und fasst zusammen, warum kein PR entstand.
 * @returns {{ subtype: string | null, numTurns: number | null, lastOutput: string, denials: string[] }}
 */
export function summarizeExecution(raw) {
  let entries = [];
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    entries = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return { subtype: null, numTurns: null, lastOutput: oneLine(raw).slice(-400), denials: [] };
  }
  const result = entries.filter((e) => e?.type === "result").pop();
  const lastText = entries
    .filter((e) => e?.type === "assistant")
    .flatMap((e) => e.message?.content ?? [])
    .filter((c) => c?.type === "text")
    .map((c) => c.text)
    .pop();
  const denials = (result?.permission_denials ?? []).map((d) => oneLine(`${d.tool_name ?? "?"} ${typeof d.tool_input === "string" ? d.tool_input : JSON.stringify(d.tool_input ?? {})}`).slice(0, 120));
  return {
    subtype: result?.subtype ?? null,
    numTurns: result?.num_turns ?? null,
    lastOutput: oneLine(typeof result?.result === "string" && result.result ? result.result : lastText).slice(-400),
    denials,
  };
}

/** Kommentar am Linear-Issue: Issue ist zurück auf Todo, mit Grund. Bei max-turns der Hinweis zum Zerlegen. */
export function noPrComment(identifier, s) {
  return [
    `Worker-Lauf für ${identifier} beendet, aber kein PR. Zurück auf Todo (SIN-291).`,
    `- Ergebnis: ${s.subtype ?? "unbekannt"}, num_turns: ${s.numTurns ?? "unbekannt"}`,
    `- Letzte Ausgabe: ${s.lastOutput || "keine"}`,
    `- Permission denials: ${s.denials.length ? s.denials.join("; ") : "keine"}`,
    ...(tooBig(s) ? ["", "Der Lauf hat die Zug-Grenze erreicht oder sehr viele Züge gebraucht: der Auftrag ist wahrscheinlich zu groß. In 2–4 Teil-Issues zerlegen (je ein PR)."] : []),
  ].join("\n");
}

/** Anzahl `numTurns`, ab der ein Auftrag ohne PR als zu groß gilt, auch ohne max-turns-Meldung. */
export const BIG_TURNS = 100;

/** Zerlegen nötig? Zug-Grenze erreicht oder sehr viele Züge ohne PR. */
export const tooBig = (s) => s.subtype === "error_max_turns" || (s.numTurns ?? 0) >= BIG_TURNS;

/**
 * Teil-Issues für einen zu großen Auftrag. Das Modell ist nicht beteiligt: der Auftrag wird nach seinen
 * Akzeptanzkriterien (`- [ ]`) in 2–4 Gruppen geteilt; jedes Teil-Issue trägt Verweis, Kriterien und die Blocker-Reihenfolge.
 * Ohne mindestens 2 Kriterien gibt es nichts zu teilen: leere Liste.
 */
export function splitIssue(issue, parts = 4) {
  const text = String(issue.description ?? "");
  const criteria = text.split("\n").filter((l) => /^\s*(?:[-*]|\d+\.)\s+(?:\[[ x]\]\s*)?\S/.test(l) && !/^#/.test(l));
  const numbered = text.match(/^\s*\d+\.\s+.+$/gm) ?? [];
  const items = numbered.length >= 2 ? numbered : criteria;
  if (items.length < 2) return [];
  const n = Math.min(parts, items.length);
  const size = Math.ceil(items.length / n);
  const groups = Array.from({ length: n }, (_, i) => items.slice(i * size, (i + 1) * size)).filter((g) => g.length);
  return groups.map((g, i) => ({
    title: `${issue.title} (Teil ${i + 1} von ${groups.length})`,
    priority: issue.priority ?? 3,
    labels: (issue.labels?.nodes ?? []).map((l) => l.name),
    description: [`Teil ${i + 1} von ${groups.length} aus ${issue.identifier} (zu groß für einen Lauf).`, "", "## Akzeptanzkriterien", ...g.map((l) => `- [ ] ${l.replace(/^\s*(?:[-*]|\d+\.)\s+(?:\[[ x]\]\s*)?/, "")}`)].join("\n"),
  }));
}

// ---------- Linear-Kontingent ----------

/**
 * Anzahl Issues gegen das Limit. `level`: ok | warn (ab 85 %, Hinweis) | stop (ab 95 %, Planer legt nichts an).
 * @param {number | null | undefined} count
 * @param {number | null} [limit] null = unbegrenzt (Linear Basic, SIN-360)
 */
export function linearQuota(count, limit = LINEAR_ISSUE_LIMIT) {
  // SIN-360: `limit: null` = Linear Basic, keine Issue-Grenze. Kein Prozent, nie warn/stop.
  if (limit === null) return { count: typeof count === "number" ? count : null, limit: null, pct: null, level: "unlimited" };
  if (typeof count !== "number" || !(limit > 0)) return { count: null, limit, pct: null, level: "unknown" };
  const pct = Math.round((count / limit) * 1000) / 10;
  return { count, limit, pct, level: pct >= LINEAR_STOP_PCT ? "stop" : pct >= LINEAR_WARN_PCT ? "warn" : "ok" };
}

export function renderLinearQuota(q) {
  if (q.level === "unlimited" && q.count != null) return `Linear: ${q.count} Issues (unbegrenzt)`;
  if (q.pct == null) return "Linear: Issue-Zahl nicht messbar";
  const tail = q.level === "stop" ? ": Planer legt keine neuen Issues an" : q.level === "warn" ? ": Hinweis, bald aufräumen" : "";
  return `Linear: ${q.count} von ${q.limit} Issues (${q.pct} %)${tail}`;
}

/** Hinweis-Issue ab 95 %: Titel nur mit Namen (ein offenes Issue). */
export function linearQuotaIssue(q) {
  if (q.level !== "stop") return null;
  return {
    lane: "backend",
    priority: 2,
    labels: ["claude", "Bug"],
    title: `${QUOTA_PREFIX} Planer pausiert (Issue-Limit nahe)`,
    description: `${q.count} von ${q.limit} Issues (${q.pct} %). Ab ${LINEAR_STOP_PCT} % legt der Planer keine neuen Issues an.\n\n## Akzeptanzkriterien\n- [ ] Erledigte Issues archiviert, Zähler unter ${LINEAR_WARN_PCT} %`,
  };
}

// ---------- Entscheidungen in gemergten PRs ----------

/**
 * Gemergte PRs mit „## Entscheidung nötig“, auf die Sinan noch nicht geantwortet hat.
 * Beantwortet = ein Kommentar des Eigentümers nach dem Merge, oder das Label `entschieden`.
 * @param {{ number: number, title: string, body?: string | null, merged_at?: string | null, labels?: string[] }[]} prs
 * @param {Record<string, { user: string, created_at: string }[]>} comments Kommentare je PR-Nummer
 * @returns {{ number: number, title: string, question: string }[]}
 */
export function pendingDecisions(prs, comments = {}, { owner = "siinanXD", now = new Date() } = {}) {
  const out = [];
  for (const p of prs) {
    if (!p.merged_at || now.getTime() - new Date(p.merged_at).getTime() > DECISION_DAYS * 86400000) continue;
    if ((p.labels ?? []).includes("entschieden")) continue;
    const decision = parseBody(p.body ?? "").decision;
    if (!decision) continue;
    const answered = (comments[p.number] ?? []).some((c) => norm(c.user) === norm(owner) && c.created_at > p.merged_at);
    if (answered) continue;
    out.push({ number: p.number, title: p.title, question: oneLine(decision.split("\n").find((l) => l.trim()) ?? decision).slice(0, 140) });
  }
  return out;
}
