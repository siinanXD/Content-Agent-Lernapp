import { runWeeklyLearningLoop } from "@/lib/learning/weekly-loop";

export async function POST() {
  const report = runWeeklyLearningLoop();
  return Response.json(report);
}

export async function GET() {
  return POST();
}
