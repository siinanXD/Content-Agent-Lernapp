#!/usr/bin/env node
/**
 * AP-16 Hermes Wochenjob: lädt den Report von content-check-sources (stdin oder Datei),
 * plant Telegram + Linear „Quelle geändert: <Map>“ + Map-Status „Prüfung nötig“
 * und selektive refresh-Targets. Secrets optional — fehlende Secrets überspringen den
 * jeweiligen Kanal, Exit-Code bleibt vom Quellen-Check.
 *
 *   npm run content:check-sources > /tmp/report.json; npm run hermes:weekly -- /tmp/report.json
 *   npm run content:check-sources | npm run hermes:weekly
 */
import { readFileSync } from "node:fs";
import { applyWeeklyAlerts, hermesWeeklyDryRun } from "../src/lib/hermes/weekly-check.ts";

const arg = process.argv[2];
const writeMapStatus = process.argv.includes("--write-status");

async function readReport() {
  if (arg && arg !== "-" && !arg.startsWith("--")) {
    return JSON.parse(readFileSync(arg, "utf8"));
  }
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (text) return JSON.parse(text);
  }
  return null;
}

const report = await readReport();
if (!report) {
  const dry = hermesWeeklyDryRun();
  console.log(JSON.stringify({ mode: "no-report", dryRun: dry }, null, 2));
  console.error("[hermes:weekly] no report — printed dry-run plan. Pass a source-check JSON.");
  process.exit(0);
}

const result = await applyWeeklyAlerts(report, { writeMapStatus, notify: true });
console.log(JSON.stringify(result, null, 2));

if (result.plan.changedMapIds.length === 0) {
  console.error("[hermes:weekly] no map changes in report.");
  process.exit(0);
}
console.error(
  `[hermes:weekly] maps=${result.plan.changedMapIds.join(",")} telegram=${result.telegram.sent} linear=${result.linear.filter((l) => l.created).length}/${result.linear.length} statusWritten=${result.mapStatus.filter((m) => m.written).length}`,
);
process.exit(0);
