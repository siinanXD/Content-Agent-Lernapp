import { adminClient } from "@/lib/admin/server";
import { fail, noStore } from "@/lib/ausbilder/server";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  organisation: string;
  contact_name: string;
  email: string;
  participants: number;
  schwerpunkt: string;
  created_at: string;
};

/** Demo-Anfragen aus `demo_requests` (SIN-416, X1). Nur Admin. */
export async function GET(request: Request) {
  const auth = await adminClient(request);
  if ("response" in auth) return auth.response;
  const { data, error } = await auth.client
    .from("demo_requests")
    .select("id, organisation, contact_name, email, participants, schwerpunkt, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return fail("Die Anfragen konnten nicht geladen werden.", 503);
  return Response.json(
    {
      anfragen: (data as Row[]).map((r) => ({
        id: r.id,
        organisation: r.organisation,
        contactName: r.contact_name,
        email: r.email,
        participants: r.participants,
        schwerpunkt: r.schwerpunkt,
        createdAt: r.created_at,
      })),
    },
    { headers: noStore },
  );
}
