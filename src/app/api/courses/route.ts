import { handleCreateCourse } from "@/lib/pipeline/mock-handlers";

export async function POST(req: Request) {
  return handleCreateCourse(req);
}
