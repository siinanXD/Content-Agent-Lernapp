/**
 * Prüfung fremder Claude-Code-Skills nach den Trend-Radar-Regeln (SIN-321).
 *
 * Aufruf: node scripts/autonomy/skill-pruefung.mjs <owner/repo> [Pfad zur SKILL.md] (braucht Netz, optional GITHUB_TOKEN nur lesend).
 * Gibt eine Tabellenzeile für den Prüfbericht aus. Kein Skill wird installiert oder ausgeführt.
 */
export const MIN_STERNE = 500;
export const MAX_ALTER_TAGE = 183;
const LIZENZEN = new Set(["mit", "apache-2.0"]);

/** Grobe Schätzung: etwa 4 Zeichen je Token. Nur zum Vergleichen, nicht zum Abrechnen. */
export function tokensSchaetzen(text) {
  return Math.ceil(String(text ?? "").length / 4);
}

/** Muster, die in einer SKILL.md nichts verloren haben: Netz, Geheimnisse, versteckte Anweisungen. */
const MUSTER = [
  ["netz", /\b(curl|wget|nc|ncat)\b/i],
  ["geheimnis", /(\.env\b|secret|api[_-]?key|token|credentials|id_rsa|\.ssh|\.aws)/i],
  ["versteckt", /<!--[\s\S]*?-->|[​-‏‪-‮⁠﻿]/],
  ["ausfuehren", /\b(eval|base64\s+-d|rm\s+-rf|chmod\s+\+x|sudo)\b/i],
  ["umgehen", /ignore (all |any )?(previous|prior|above) (instructions|rules)|disregard (the )?(system|rules)/i],
];

/** Liefert die Namen der Muster, die in `text` anschlagen. Treffer sind Hinweise, kein Urteil: von Hand lesen. */
export function skillBefunde(text) {
  const t = String(text ?? "");
  return MUSTER.filter(([, re]) => re.test(t)).map(([name]) => name);
}

/** Erfüllt das Repo die Regel aus AGENTS.md (Lizenz MIT/Apache, jünger als 6 Monate, mehr als 500 Sterne)? */
export function repoBewerten({ lizenz, sterne, letzterCommit }, jetzt = new Date()) {
  const gruende = [];
  if (!LIZENZEN.has(String(lizenz ?? "").toLowerCase())) gruende.push(`Lizenz ${lizenz || "unbekannt"}`);
  if (!(sterne > MIN_STERNE)) gruende.push(`Sterne ${sterne ?? "?"}`);
  const alter = (jetzt - new Date(letzterCommit)) / 86400000;
  if (!(alter <= MAX_ALTER_TAGE)) gruende.push("letzter Commit älter als 6 Monate");
  return { ok: gruende.length === 0, gruende };
}

async function hole(url, roh = false) {
  const headers = { "User-Agent": "skill-pruefung", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return roh ? res.text() : res.json();
}

async function main() {
  const [repo, pfad] = process.argv.slice(2);
  if (!repo) throw new Error("Aufruf: skill-pruefung.mjs <owner/repo> [Pfad zur SKILL.md]");
  const r = await hole(`https://api.github.com/repos/${repo}`);
  const bewertung = repoBewerten({ lizenz: r.license?.spdx_id?.toLowerCase(), sterne: r.stargazers_count, letzterCommit: r.pushed_at });
  let skill = "";
  if (pfad) skill = await hole(`https://raw.githubusercontent.com/${repo}/${r.default_branch}/${pfad}`, true);
  const befunde = pfad ? skillBefunde(skill) : [];
  const zellen = [repo, r.license?.spdx_id ?? "keine", r.stargazers_count, r.pushed_at?.slice(0, 10), pfad ? `~${tokensSchaetzen(skill)} Tokens` : "-", befunde.join(", ") || "keine", bewertung.ok ? "Regel erfüllt" : bewertung.gruende.join("; ")];
  console.log(`| ${zellen.join(" | ")} |`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
