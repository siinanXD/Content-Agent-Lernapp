#!/usr/bin/env node
/**
 * Laufprotokoll pro Worker-Lauf (SIN-296): gelesene Dateien, Entscheidungen, ausgeführte Prüfungen, Ergebnis,
 * Abbruchgrund. Gebaut aus der Execution-Datei von claude-code-action (mechanisch, kein Claude-Aufruf).
 *
 *   node scripts/autonomy/protokoll.mjs write --out laufprotokoll/protokoll.md --label "Worker" --run <id> \
 *        --file <execution_file> [--file <zweite>] [--issues "SIN-1 SIN-2"]
 *   node scripts/autonomy/protokoll.mjs link --link <URL> --branch claude/sin-1 [--issues "SIN-1"]
 *
 * `write` legt die Markdown-Datei an (Artefakt `laufprotokoll`). `link` hängt „## Laufprotokoll“ mit dem Link an den
 * PR-Text (der Steckbrief zeigt ihn) und schreibt einen Linear-Kommentar. Nie ein Fehlerabbruch: Protokollieren darf
 * keinen Lauf kippen. Braucht GITHUB_REPOSITORY und GH_TOKEN für `link`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { summarizeExecution } from "./diagnose.mjs";
import { comment, fetchProjectIssues } from "./linear.mjs";

export const PROTOCOL_HEAD = "## Laufprotokoll";
const CHECK_RE = /\b(npm (ci|test|run [\w:-]+)|npx (tsc|eslint|playwright)[^\n]*|node scripts\/autonomy\/(screenshots|figma)\.mjs[^\n]*)/;
const MAX_LIST = 25;

const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const unique = (xs) => [...new Set(xs)];
const rel = (p) => p.replace(/^\/home\/runner\/work\/[^/]+\/[^/]+\//, "");

/**
 * Wertet eine Execution-Datei aus (JSON-Array der Sitzung). Fehlt oder bricht etwas, bleiben die Listen leer.
 * @returns {{ read: string[], decisions: string[], checks: { cmd: string, ok: boolean | null }[], subtype: string | null, turns: number | null, lastOutput: string, denials: string[] }}
 */
export function protocolFromExecution(raw) {
  let entries = [];
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    entries = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    /* unlesbar: nur Kopfdaten */
  }
  const blocks = entries.flatMap((e) => (Array.isArray(e?.message?.content) ? e.message.content : []));
  const results = new Map(blocks.filter((b) => b?.type === "tool_result").map((b) => [b.tool_use_id, b]));
  const read = [];
  const written = [];
  const checks = [];
  for (const b of blocks) {
    if (b?.type !== "tool_use") continue;
    const input = b.input ?? {};
    if (b.name === "Read" && input.file_path) read.push(rel(String(input.file_path)));
    if ((b.name === "Write" || b.name === "Edit") && input.file_path) written.push(rel(String(input.file_path)));
    if (b.name === "Bash" && input.command) {
      const m = CHECK_RE.exec(String(input.command));
      if (m) {
        const res = results.get(b.id);
        checks.push({ cmd: oneLine(m[0]).slice(0, 100), ok: res ? res.is_error !== true : null });
      }
    }
  }
  const s = summarizeExecution(raw);
  return {
    read: unique(read),
    decisions: unique(written).filter((p) => /^docs\/(decisions\/|autonomy\/LEHREN\.md|skills\/)/.test(p)),
    checks,
    subtype: s.subtype,
    turns: s.numTurns,
    lastOutput: s.lastOutput,
    denials: s.denials,
  };
}

const list = (xs, empty = "keine") =>
  xs.length ? [...xs.slice(0, MAX_LIST).map((x) => `- ${x}`), ...(xs.length > MAX_LIST ? [`- … und ${xs.length - MAX_LIST} weitere`] : [])] : [`- ${empty}`];

/** Abbruchgrund in Klartext; „keiner“ bei Erfolg. */
export function abortReason(p) {
  if (p.subtype === "success") return "keiner";
  if (!p.subtype) return "unbekannt (keine Ergebnis-Zeile im Log)";
  const base = p.subtype === "error_max_turns" ? "Runden-Deckel erreicht (error_max_turns)" : p.subtype;
  return p.denials.length ? `${base}; verweigerte Aufrufe: ${p.denials.slice(0, 3).join("; ")}` : base;
}

/**
 * Markdown-Protokoll für einen oder zwei Versuche.
 * @param {{ identifiers?: string, run?: string, runs?: { label: string, p: ReturnType<typeof protocolFromExecution> }[] }} input
 */
export function renderProtocol({ identifiers = "", run = "", runs = [] }) {
  const out = [`# Laufprotokoll ${identifiers}`.trim(), "", `Lauf ${run || "unbekannt"} (SIN-296). Gebaut aus dem Log des Laufs, nicht von Claude geschrieben.`];
  for (const { label, p } of runs) {
    const failed = p.checks.filter((c) => c.ok === false).length;
    out.push(
      "",
      `## ${label}`,
      "",
      `**Ergebnis:** ${p.subtype ?? "unbekannt"}${p.turns != null ? `, ${p.turns} Runden` : ""}`,
      `**Abbruchgrund:** ${abortReason(p)}`,
      "",
      `**Gelesene Dateien (${p.read.length}):**`,
      ...list(p.read),
      "",
      "**Entscheidungen, Lehren und Skills (geschriebene Dateien):**",
      ...list(p.decisions),
      "",
      `**Ausgeführte Prüfungen (${p.checks.length}${failed ? `, ${failed} rot` : ""}):**`,
      ...list(p.checks.map((c) => `${c.cmd} → ${c.ok === null ? "ohne Ergebnis" : c.ok ? "ok" : "Fehler"}`)),
      "",
      `**Letzte Ausgabe:** ${p.lastOutput || "keine"}`,
    );
  }
  return `${out.join("\n")}\n`;
}

/** Hängt den Link an den PR-Text; derselbe Lauf (`run`) wird nie doppelt eingetragen. */
export function appendProtocolLink(body, { link, run = "", label = "Worker" }) {
  const text = String(body ?? "");
  const mark = run ? ` <!-- protokoll: ${run} -->` : "";
  if (run && text.includes(`<!-- protokoll: ${run} -->`)) return text;
  const entry = `- [${label}: Laufprotokoll (Artefakt laufprotokoll)](${link})${mark}`;
  if (text.includes(PROTOCOL_HEAD)) return `${text.trimEnd()}\n${entry}\n`;
  return `${text.trimEnd()}\n\n${PROTOCOL_HEAD}\n${entry}\n`;
}

async function gh(path, { method = "GET", body } = {}, env = process.env) {
  const token = env.GH_TOKEN ?? env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path}: ${res.status}`);
  return res.json();
}

export async function main(argv, env = process.env) {
  const cmd = argv[0];
  const arg = (n, d = "") => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const all = (n) => argv.flatMap((a, i) => (a === n && argv[i + 1] ? [argv[i + 1]] : []));
  const run = arg("--run", env.GITHUB_RUN_ID ?? "");
  const issues = arg("--issues").split(/[\s,+]+/).filter(Boolean);
  if (cmd === "write") {
    const files = all("--file");
    const runs = files.map((f, i) => ({
      label: files.length > 1 ? (i === 0 ? "Versuch 1" : "Versuch 2 (Sonnet)") : arg("--label", "Worker"),
      p: protocolFromExecution(f && existsSync(f) ? readFileSync(f, "utf8") : ""),
    }));
    const out = arg("--out", "laufprotokoll/protokoll.md");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderProtocol({ identifiers: issues.join(" "), run, runs }));
    console.log(`Laufprotokoll: ${out} (${runs.length} Versuch${runs.length === 1 ? "" : "e"})`);
    return;
  }
  if (cmd === "link") {
    const repo = env.GITHUB_REPOSITORY;
    const link = arg("--link") || (repo && run ? `${env.GITHUB_SERVER_URL ?? "https://github.com"}/${repo}/actions/runs/${run}` : "");
    if (!link) return console.log("::warning::Kein Link zum Laufprotokoll.");
    const branch = arg("--branch");
    if (repo && branch && (env.GH_TOKEN || env.GITHUB_TOKEN)) {
      try {
        const [owner] = repo.split("/");
        const prs = await gh(`/repos/${repo}/pulls?state=open&head=${owner}:${branch}`, {}, env);
        if (prs[0]) {
          const body = appendProtocolLink(prs[0].body, { link, run });
          if (body !== prs[0].body) await gh(`/repos/${repo}/pulls/${prs[0].number}`, { method: "PATCH", body: { body } }, env);
        } else console.log("Kein offener PR für den Branch: Protokoll nur als Artefakt.");
      } catch (e) {
        console.log(`::warning::Protokoll-Link nicht in den PR geschrieben: ${e.message}`);
      }
    }
    if (env.LINEAR_API_KEY && issues.length) {
      try {
        const found = (await fetchProjectIssues()).find((i) => i.identifier === issues[0]);
        if (found) await comment(found.id, `Laufprotokoll für ${issues.join(", ")} (SIN-296): ${link}`);
      } catch (e) {
        console.log(`::warning::Protokoll nicht nach Linear geschrieben: ${e.message}`);
      }
    }
    return;
  }
  console.log("Aufruf: protokoll.mjs write|link …");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((e) => console.log(`::warning::${e.message}`));
}
