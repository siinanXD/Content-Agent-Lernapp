#!/usr/bin/env node
const { hermesWeeklyDryRun } = await import("../src/lib/hermes/weekly-check.ts");
const report = hermesWeeklyDryRun();
console.log(JSON.stringify(report, null, 2));
if (report.liveBlocked) {
  console.error("\n[hermes] live deploy skipped (scaffold).");
}
process.exit(0);
