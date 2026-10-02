import { runMafPilot } from "../src/lib/pilot/run-maf-pilot.ts";

const report = await runMafPilot();
console.log(JSON.stringify(report, null, 2));
if (!report.passed) {
  process.exit(1);
}
