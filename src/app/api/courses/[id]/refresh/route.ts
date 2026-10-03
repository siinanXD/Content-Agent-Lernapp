import { handleRefresh } from "@/lib/pipeline/mock-handlers";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  return handleRefresh(id, req);
}
