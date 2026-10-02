#!/usr/bin/env node
const { runMafPilot } = await import("../src/lib/pilot/run-maf-pilot.ts");
const report = await runMafPilot();
console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
