import { adminClient } from "@/lib/admin/server";
import { fail, noStore } from "@/lib/ausbilder/server";

export const dynamic = "force-dynamic";

type Row = { id: string; keyword: string; status: string; mock: boolean; created_at: string };

/** Alle Kurse lesen (SIN-416, X1). Nur Admin; Ausbilder und Lernende sehen nur ihre eigenen Daten. */
export async function GET(request: Request) {
  const auth = await adminClient(request);
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.client
    .from("courses")
    .select("id, keyword, status, mock, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return fail("Die Kurse konnten nicht geladen werden.", 503);
  return Response.json(
    {
      kurse: (data as Row[]).map((c) => ({
        id: c.id,
        keyword: c.keyword,
        status: c.status,
        mock: c.mock,
        createdAt: c.created_at,
      })),
    },
    { headers: noStore },
  );
}
