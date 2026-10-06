import { getHealthReport } from "@/lib/health";

export async function GET() {
  const { status, body } = await getHealthReport();
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
