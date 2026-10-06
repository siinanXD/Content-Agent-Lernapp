import { createClient } from "@supabase/supabase-js";
import type { Overview } from "@/lib/ausbilder/overview";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

type OverviewRow = {
  member_id: string;
  display_name: string;
  progress_percent: number;
  last_active_at: string | null;
};

/**
 * Gruppenübersicht der angemeldeten Ausbilder (SIN-277). Läuft mit dem Anon-Key und dem Token der
 * Person, nie mit dem Service-Role-Key: Row Level Security lässt nur die eigene Gruppe durch.
 */
export async function GET(request: Request) {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) {
    return Response.json({ error: "Bitte anmelden." }, { status: 401, headers: noStore });
  }

  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return Response.json(
      { error: "Die Gruppenübersicht ist noch nicht eingerichtet." },
      { status: 503, headers: noStore },
    );
  }

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth.user) {
    return Response.json({ error: "Bitte anmelden." }, { status: 401, headers: noStore });
  }
  if (auth.user.app_metadata?.role !== "ausbilder") {
    return Response.json({ error: "Dieser Zugang ist kein Ausbilder-Zugang." }, { status: 403, headers: noStore });
  }

  const { data: group, error: groupError } = await client
    .from("trainer_groups")
    .select("name, schwerpunkt, exam_date, starts_on")
    .maybeSingle();
  if (groupError) {
    return Response.json({ error: "Die Gruppe konnte nicht geladen werden." }, { status: 503, headers: noStore });
  }
  if (!group) {
    return Response.json({ error: "Ihnen ist noch keine Gruppe zugeordnet." }, { status: 404, headers: noStore });
  }

  const { data: rows, error: rowsError } = await client.rpc("ausbilder_uebersicht");
  if (rowsError) {
    return Response.json({ error: "Die Gruppe konnte nicht geladen werden." }, { status: 503, headers: noStore });
  }

  const body: Overview = {
    group: {
      name: group.name,
      schwerpunkt: group.schwerpunkt,
      examDate: group.exam_date,
      startsOn: group.starts_on,
    },
    members: ((rows ?? []) as OverviewRow[]).map((r) => ({
      id: r.member_id,
      name: r.display_name,
      progressPercent: r.progress_percent,
      lastActiveAt: r.last_active_at,
    })),
  };
  return Response.json(body, { headers: noStore });
}
