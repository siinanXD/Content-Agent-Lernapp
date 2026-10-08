import type { Overview } from "@/lib/ausbilder/overview";
import { checkGroupInput } from "@/lib/ausbilder/gruppe";
import { ausbilderClient, fail, noStore } from "@/lib/ausbilder/server";

export const dynamic = "force-dynamic";

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
  const auth = await ausbilderClient(request, "Die Gruppenübersicht ist noch nicht eingerichtet.");
  if ("response" in auth) return auth.response;
  const { client } = auth;

  const { data: group, error: groupError } = await client
    .from("trainer_groups")
    .select("name, schwerpunkt, exam_date, starts_on")
    .maybeSingle();
  if (groupError) return fail("Die Gruppe konnte nicht geladen werden.", 503);
  if (!group) return fail("Ihnen ist noch keine Gruppe zugeordnet.", 404);

  const { data: rows, error: rowsError } = await client.rpc("ausbilder_uebersicht");
  if (rowsError) return fail("Die Gruppe konnte nicht geladen werden.", 503);

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

/**
 * Gruppe anlegen (SIN-356). Rolle und „eine Gruppe je Ausbilder“ prüft die Funktion
 * `ausbilder_gruppe_anlegen` in der Datenbank; hier wird nur die Eingabe geprüft.
 */
export async function POST(request: Request) {
  const auth = await ausbilderClient(request, "Das Anlegen von Gruppen ist noch nicht eingerichtet.");
  if ("response" in auth) return auth.response;

  const input = checkGroupInput(await request.json().catch(() => null));
  if (!input.ok) return fail(input.error, 400);
  const { name, schwerpunkt, startsOn, examDate } = input.value;

  const { data, error } = await auth.client.rpc("ausbilder_gruppe_anlegen", {
    p_name: name,
    p_schwerpunkt: schwerpunkt,
    p_starts_on: startsOn,
    p_exam_date: examDate,
  });
  if (error) {
    if (error.code === "23505") return fail("Sie haben bereits eine Gruppe.", 409);
    if (error.code === "42501") return fail("Dieser Zugang ist kein Ausbilder-Zugang.", 403);
    if (error.code === "22023") return fail("Bitte prüfen Sie Ihre Angaben.", 400);
    return fail("Die Gruppe konnte nicht angelegt werden. Bitte versuchen Sie es noch einmal.", 503);
  }
  return Response.json({ id: data }, { status: 201, headers: noStore });
}
