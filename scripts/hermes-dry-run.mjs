import { hermesWeeklyDryRun } from "../src/lib/hermes/weekly-check.ts";

const report = hermesWeeklyDryRun();
console.log(JSON.stringify(report, null, 2));
if (!report.liveBlocked) {
  console.error("expected liveBlocked");
  process.exit(1);
}
