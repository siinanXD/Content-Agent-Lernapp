import { getHealth } from "@/lib/health";

export async function GET() {
  return Response.json(getHealth());
}
