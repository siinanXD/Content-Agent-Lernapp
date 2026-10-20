#!/usr/bin/env node
/**
 * Verwerfungsgründe der Reparatur je Runde, lesend (SIN-862). `npm run quality:repair [-- --out docs/quality/SIN-862-reparatur-gruende.md]`.
 * Quelle: `question_evaluations`; die Runde steht im Suffix von `run_id` (`…-bootstrap`, `…-repair1`, `…-repair2`). Keine Kosten, nur GET.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { failedCriteria, groupQuote, topReasons } from "./quality-quote.mjs";
import { fetchAll } from "./content-metrics.mjs";

export const runde = (runId) => String(runId).match(/-(bootstrap|repair\d+)$/)?.[1] ?? null;

export function computeRepair(evaluations) {
  const rows = evaluations.filter((e) => runde(e.run_id));
  const rounds = [...new Set(rows.map((e) => runde(e.run_id)))].sort();
  return rounds.map((r) => {
    const mine = rows.filter((e) => runde(e.run_id) === r);
    const failed = mine.filter((e) => !e.passed);
    return { runde: r, bewertet: mine.length, bestanden: mine.length - failed.length, quote: groupQuote(mine, () => r)[0]?.pct ?? 0, kriterien: failedCriteria(failed), gruende: topReasons(failed, 5) };
  });
}

export function renderRepair(rounds, { stand = new Date().toISOString().slice(0, 10) } = {}) {
  return [
    `# Reparatur: Verwerfungsgründe je Runde (Stand ${stand})`,
    "",
    "Abfrage: `GET question_evaluations?select=unit_id,run_id,passed,quellentreue,eindeutigkeit,niveau,sprache,sicherheit_flag,reason`, gruppiert nach Suffix von `run_id` (`scripts/autonomy/repair-gruende.mjs`, `npm run quality:repair`).",
    "",
    ...rounds.flatMap((r) => [
      `## ${r.runde}: ${r.bestanden} von ${r.bewertet} bestanden (${r.quote} %)`,
      "",
      "| Kriterium | Durchfaller |",
      "| --- | ---: |",
      ...r.kriterien.map(([k, n]) => `| ${k} | ${n} |`),
      "",
      ...r.gruende.map(([g, n]) => `1. ${n}× ${g}`),
      "",
    ]),
  ].join("\n");
}

async function main() {
  const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
  const { SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!(base && key)) {
    console.log("nicht verfügbar: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen (lesender Zugriff nötig).");
    return;
  }
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const rows = await fetchAll(base, "question_evaluations", "select=unit_id,run_id,passed,quellentreue,eindeutigkeit,niveau,sprache,sicherheit_flag,reason&order=created_at,id", h);
  const md = renderRepair(computeRepair(rows));
  if (out) writeFileSync(out, md);
  console.log(md);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
