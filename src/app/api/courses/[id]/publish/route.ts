import { adminGuard } from "@/lib/admin/server";
import { handlePublish } from "@/lib/pipeline/mock-handlers";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const { id } = await params;
  return handlePublish(id);
}
