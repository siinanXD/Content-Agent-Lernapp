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
import { pathToFileURL } from "node:url";
import { comment, fetchProjectIssues } from "./linear.mjs";

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
    const issue = (await fetchProjectIssues()).find((i) => i.identifier === identifier);
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
