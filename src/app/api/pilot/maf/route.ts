import { runMafPilot } from "@/lib/pilot/run-maf-pilot";

export async function POST() {
  const report = await runMafPilot();
  return Response.json(report, { status: report.passed ? 200 : 422 });
}
