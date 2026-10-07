#!/usr/bin/env node
/**
 * Review-Agent (SIN-297): Ein Modell aus einer anderen Familie als der Worker (OpenAI statt Claude) liest den
 * PR-Diff gegen den Auftrag und meldet Fehler, Sicherheitslücken, Abweichungen vom Auftrag und fehlende Tests.
 * Ergebnis: ein Kommentar mit Schwere (`schwer` → Reparatur im selben PR, `leicht` → nur Hinweis). Dazu
 * feste Prüfungen am Diff (Barrierefreiheits-Tests abgeschaltet, Zugangsdaten), die ohne Modell auskommen.
 * Kosten je Review stehen als Ledger im Kommentar; ein Tagesdeckel stoppt weitere Reviews.
 *
 *   node scripts/autonomy/review.mjs --pr 123
 *
 * Braucht GITHUB_REPOSITORY, GH_TOKEN, OPENAI_API_KEY; optional REVIEW_DAILY_CAP_USD, GITHUB_OUTPUT.
 * Ohne OPENAI_API_KEY: nur die festen Prüfungen. Nie Personendaten oder Secrets im Prompt: der Diff geht
 * als Text hinaus, Zugangsdaten stehen laut Regeln nie im Repo (gitleaks im pr-gate).
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fetchJson } from "./http.mjs";

/** Wie `JUDGE_MODEL` in src/lib/quality/evaluate-agent.ts: günstige Klasse, schon im Repo geprüft (D-06/D-07). */
export const REVIEW_MODEL = "gpt-5.4-mini";
/** USD je 1M Token, wie `GPT_JUDGE_*` in src/lib/quality/cost-guard.ts. */
export const PRICE_IN_PER_MTOK = 0.75;
export const PRICE_OUT_PER_MTOK = 4.5;
export const DEFAULT_DAILY_CAP_USD = 2;
export const MAX_DIFF_CHARS = 60000;
export const MARKER = "<!-- review-agent -->";
const LEDGER_RE = /<!-- review-ledger: (\[.*?\]) -->/s;

/** Prüfbare Liste der Verbote aus AGENTS.md (Spiegel von src/lib/review/regeln.ts; ein Test hält beide gleich). */
export const REGELN = [
  "IHK-Prüfungsaufgaben kopieren",
  "Personendaten in Prompts",
  "Inhalte unter der Qualitäts-Schwelle veröffentlichen",
  "Zugangsdaten, Abrechnung oder Datenbank-Löschungen anfassen",
  "Barrierefreiheits-Tests abschalten, um einen Merge durchzubekommen",
  "Ohne amtliche Quelle wird kein Lerninhalt erzeugt.",
  "Jede Lerneinheit speichert Quelle und Abrufdatum.",
  "KI-erzeugte Inhalte sind als solche gekennzeichnet.",
];

export const costUsd = (usage = {}) =>
  Math.round(
    (((usage.prompt_tokens ?? 0) / 1e6) * PRICE_IN_PER_MTOK + ((usage.completion_tokens ?? 0) / 1e6) * PRICE_OUT_PER_MTOK) * 1e6,
  ) / 1e6;

/** Diff aus den Dateien der GitHub-API; auf `max` Zeichen gekürzt (mit Hinweis), damit die Kosten begrenzt bleiben. */
export function buildDiff(files, max = MAX_DIFF_CHARS) {
  let out = "";
  let cut = 0;
  for (const f of files) {
    const part = `--- ${f.filename} (${f.status ?? "modified"})\n${f.patch ?? "(kein Textdiff)"}\n`;
    if (out.length + part.length > max) cut++;
    else out += part;
  }
  return cut ? `${out}\n[${cut} weitere Datei(en) gekürzt]\n` : out;
}

export function reviewMessages({ title, body, diff }) {
  return [
    {
      role: "system",
      content:
        "Du bist Reviewer für Pull Requests in einer Lernapp-Codebasis (Next.js, TypeScript). Prüfe den Diff gegen den Auftrag: " +
        "Fehler, Sicherheitslücken, Abweichung vom Auftrag, fehlende Tests, Verstöße gegen diese Regeln:\n" +
        REGELN.map((r) => `- ${r}`).join("\n") +
        "\nSchwere: `schwer` nur bei echten Fehlern, Sicherheitslücken, Regelverstößen oder klarer Abweichung vom Auftrag, die vor dem Merge behoben werden müssen. " +
        "Alles andere (Stil, Namen, Kleinigkeiten, Vorschläge) ist `leicht`. Erfinde nichts: melde nur, was im Diff belegt ist, mit Datei. " +
        'Antworte ausschließlich als JSON {"zusammenfassung":"ein Satz","funde":[{"schwere":"schwer|leicht","datei":"pfad","text":"kurz, deutsch"}]}. Keine Funde: leere Liste.',
    },
    { role: "user", content: `Auftrag (PR-Titel und Beschreibung):\n${title}\n${body ?? ""}\n\nDiff:\n${diff}` },
  ];
}

/** Antwort des Modells → Funde. Wirft bei ungültigem JSON; unbekannte Schwere zählt als `leicht`. */
export function parseReview(text) {
  const data = JSON.parse(text);
  const funde = (Array.isArray(data.funde) ? data.funde : [])
    .filter((f) => f && typeof f.text === "string" && f.text.trim())
    .map((f) => ({
      schwere: f.schwere === "schwer" ? "schwer" : "leicht",
      datei: typeof f.datei === "string" ? f.datei : "",
      text: f.text.trim(),
    }));
  return { zusammenfassung: typeof data.zusammenfassung === "string" ? data.zusammenfassung.trim() : "", funde };
}

const A11Y_TEST = /^(e2e|live|visual)\/|(^|\/)[^/]*(a11y|axe)[^/]*\.(spec|test)\.[tj]sx?$/i;
const SKIP = /\b(test|it|describe)\.(skip|fixme)\b|\bxit\(|\bxdescribe\(|\.disableRules\(|\.exclude\(/;

/** Feste Prüfungen am Diff ohne Modell: abgeschaltete Barrierefreiheits-Tests, gelöschte a11y-Testdateien. */
export function diffChecks(files) {
  const funde = [];
  for (const f of files) {
    if (!A11Y_TEST.test(f.filename) && !/axe/i.test(f.patch ?? "")) continue;
    if (f.status === "removed" && /(a11y|axe)/i.test(f.filename)) {
      funde.push({ schwere: "schwer", datei: f.filename, text: "Barrierefreiheits-Test gelöscht (AGENTS.md: Tests nie abschalten, um zu mergen)." });
      continue;
    }
    const added = (f.patch ?? "").split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
    if (added.some((l) => SKIP.test(l))) {
      funde.push({ schwere: "schwer", datei: f.filename, text: "Test übersprungen oder Regel ausgeschaltet (skip/fixme/disableRules/exclude)." });
    }
  }
  return funde;
}

export const hasSevere = (funde) => funde.some((f) => f.schwere === "schwer");

/** Ledger-Einträge aus einem Kommentartext. */
export function readLedger(body = "") {
  const m = LEDGER_RE.exec(body);
  if (!m) return [];
  try {
    return JSON.parse(m[1]);
  } catch {
    return [];
  }
}

/** Summe der Kosten (USD) eines Tages über die Kommentare (alle PRs). */
export function daySpend(commentBodies, day) {
  return commentBodies.flatMap((b) => (b.includes(MARKER) ? readLedger(b) : [])).filter((e) => e.d === day).reduce((s, e) => s + (e.usd ?? 0), 0);
}

export function formatComment({ result, funde, ledger, model = REVIEW_MODEL, note = "" }) {
  const schwer = funde.filter((f) => f.schwere === "schwer");
  const leicht = funde.filter((f) => f.schwere !== "schwer");
  const fmt = (f) => `- ${f.datei ? `\`${f.datei}\`: ` : ""}${f.text}`;
  const last = ledger.at(-1);
  return [
    MARKER,
    "## Review (zweites Modell)",
    "",
    result?.zusammenfassung || note || "Keine Zusammenfassung.",
    "",
    schwer.length ? `**Schwer (${schwer.length}):** wird im selben PR repariert.\n${schwer.map(fmt).join("\n")}\n` : "**Keine schweren Funde.**\n",
    leicht.length ? `**Leicht (${leicht.length}):** nur Hinweis.\n${leicht.map(fmt).join("\n")}\n` : "",
    `<sub>Modell ${model}${last ? `, Kosten ${last.usd.toFixed(4)} USD, Stand ${last.sha.slice(0, 7)}` : ""}. Das Ergebnis ersetzt keine Freigabe von Sinan.</sub>`,
    `<!-- review-ledger: ${JSON.stringify(ledger)} -->`,
    `<!-- review-severe: ${schwer.length ? "true" : "false"} -->`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

async function gh(path, { method = "GET", body } = {}, env = process.env) {
  return fetchJson("GitHub", `https://api.github.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.GH_TOKEN ?? env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function paged(path, env, max = 5) {
  const out = [];
  for (let p = 1; p <= max; p++) {
    const page = await gh(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${p}`, {}, env);
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

async function askModel(messages, env) {
  const data = await fetchJson("OpenAI", "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: REVIEW_MODEL, response_format: { type: "json_object" }, messages }),
  });
  return { text: data.choices?.[0]?.message?.content ?? "{}", usage: data.usage ?? {} };
}

function output(env, kv) {
  console.log(Object.entries(kv).map(([k, v]) => `${k}=${v}`).join(" "));
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, Object.entries(kv).map(([k, v]) => `${k}=${v}\n`).join(""));
}

export async function main(argv, env = process.env, now = new Date()) {
  const pr = argv.includes("--pr") ? argv[argv.indexOf("--pr") + 1] : env.PR_NUMBER;
  const repo = env.GITHUB_REPOSITORY;
  if (!pr || !repo) throw new Error("--pr und GITHUB_REPOSITORY nötig");
  const day = now.toISOString().slice(0, 10);
  const cap = Number(env.REVIEW_DAILY_CAP_USD) || DEFAULT_DAILY_CAP_USD;

  const data = await gh(`/repos/${repo}/pulls/${pr}`, {}, env);
  if (data.labels?.some((l) => l.name === "no-review")) return output(env, { severe: false, skipped: "no-review" });
  const sha = data.head.sha;
  const files = await paged(`/repos/${repo}/pulls/${pr}/files`, env);
  const comments = await paged(`/repos/${repo}/issues/${pr}/comments`, env);
  const mine = comments.find((c) => c.body?.includes(MARKER));
  const ledger = readLedger(mine?.body);
  if (ledger.some((e) => e.sha === sha)) return output(env, { severe: /review-severe: true/.test(mine.body), skipped: "schon-geprueft" });

  const feste = diffChecks(files);
  let result = null;
  let funde = [...feste];
  let note = "";
  let entry = { d: day, usd: 0, sha };

  const today = await paged(`/repos/${repo}/issues/comments?since=${day}T00:00:00Z`, env, 10);
  if (!env.OPENAI_API_KEY) note = "Kein OPENAI_API_KEY: nur die festen Prüfungen liefen.";
  else if (daySpend(today.map((c) => c.body ?? ""), day) >= cap) note = `Tagesdeckel von ${cap} USD erreicht: nur die festen Prüfungen liefen.`;
  else {
    const { text, usage } = await askModel(reviewMessages({ title: data.title, body: data.body, diff: buildDiff(files) }), env);
    entry = { d: day, usd: costUsd(usage), sha };
    result = parseReview(text);
    funde = [...feste, ...result.funde];
  }

  const body = formatComment({ result, funde, ledger: [...ledger, entry], note });
  if (mine) await gh(`/repos/${repo}/issues/comments/${mine.id}`, { method: "PATCH", body: { body } }, env);
  else await gh(`/repos/${repo}/issues/${pr}/comments`, { method: "POST", body: { body } }, env);
  output(env, { severe: hasSevere(funde), sha });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    // Ein Ausfall des Reviews darf den PR nicht blockieren: Warnung, kein Abbruch.
    console.log(`::warning::Review-Agent: ${e.message}`);
  });
}
