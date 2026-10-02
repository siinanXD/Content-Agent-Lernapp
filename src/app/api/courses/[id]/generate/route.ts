import { handleGenerate } from "@/lib/pipeline/mock-handlers";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  return handleGenerate(id);
}
