import { adminGuard } from "@/lib/admin/server";
import { handleCreateCourse } from "@/lib/pipeline/mock-handlers";

export async function POST(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  return handleCreateCourse(req);
}
