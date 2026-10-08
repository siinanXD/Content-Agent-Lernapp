#!/usr/bin/env node
/**
 * Live-Updates des Workers als Kommentar im Linear-Issue (SIN-298).
 *
 *   node scripts/autonomy/live.mjs gestartet SIN-123 [--run URL]
 *   node scripts/autonomy/live.mjs fortschritt SIN-123 "Tests laufen"      (Claude, während der Arbeit)
 *   node scripts/autonomy/live.mjs frage SIN-123 "Welche Quelle gilt?"      (Rückfrage im Issue, nicht nur im PR)
 *   node scripts/autonomy/live.mjs fertig SIN-123 --pr https://github.com/…/pull/1
 *   node scripts/autonomy/live.mjs gescheitert SIN-123 "Grund"
 *
 * Fehler sind nie fatal (Exit 0): ein Linear-Ausfall darf einen Lauf nicht abbrechen.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { comment, linear } from "./linear.mjs";

export const MAX_FORTSCHRITT = 3;

/** Zählt Fortschritts-Kommentare je Lauf in einer Datei; false, sobald die Grenze erreicht ist. */
export function allowFortschritt(identifier, dir = process.env.RUNNER_TEMP || tmpdir(), max = MAX_FORTSCHRITT) {
  const file = join(dir, `live-fortschritt-${identifier}.count`);
  const n = existsSync(file) ? Number(readFileSync(file, "utf8")) || 0 : 0;
  if (n >= max) return false;
  writeFileSync(file, String(n + 1));
  return true;
}

/** Issue per Kennung, unabhängig vom Status (fertig/gescheitert kommen nach dem Statuswechsel). */
export async function findIssue(identifier, call = linear) {
  const data = await call(`query($id: String!) { issue(id: $id) { id identifier } }`, { id: identifier });
  return data.issue;
}

const trim = (s, n = 1500) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Kommentartext je Art; reine Funktion. */
export function liveText(kind, { text = "", pr = "", run = "" } = {}) {
  const lauf = run ? ` ([Lauf](${run}))` : "";
  switch (kind) {
    case "gestartet":
      return `Worker gestartet${lauf}.`;
    case "fortschritt":
      return text ? `Worker: ${trim(text)}` : "";
    case "frage":
      return text ? `Rückfrage vom Worker: ${trim(text)}` : "";
    case "fertig":
      return pr ? `Worker fertig: ${pr}${lauf}` : `Worker fertig${lauf}.`;
    case "gescheitert":
      return `Worker gescheitert${lauf}: ${trim(text) || "ohne PR beendet"}`;
    default:
      return "";
  }
}

/** Positionsargumente ohne Flags und deren Werte. */
export function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i] ?? "";
    else pos.push(argv[i]);
  }
  const [kind, identifier, ...text] = pos;
  return { kind, identifier, text: text.join(" "), pr: flags.pr ?? "", run: flags.run ?? "" };
}

export async function main(argv = process.argv.slice(2)) {
  const { kind, identifier, text, pr, run } = parseArgs(argv);
  const body = liveText(kind, { text, pr, run });
  if (!body || !identifier) return console.log("Aufruf: live.mjs gestartet|fortschritt|frage|fertig|gescheitert SIN-123 [Text] [--pr URL] [--run URL]");
  try {
    if (kind === "fortschritt" && !allowFortschritt(identifier)) return console.log(`Grenze von ${MAX_FORTSCHRITT} Fortschritts-Kommentaren erreicht, kein Kommentar`);
    const issue = await findIssue(identifier);
    if (!issue) return console.log(`${identifier} nicht gefunden, kein Kommentar`);
    await comment(issue.id, body);
    console.log(`Kommentar in ${identifier}: ${body}`);
  } catch (e) {
    console.log(`::warning::Live-Kommentar für ${identifier} nicht gesendet: ${e.message}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => console.log(`::warning::${e.message}`));
}
