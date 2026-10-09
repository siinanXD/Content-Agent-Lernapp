import { checkNames, type Invitation } from "@/lib/ausbilder/gruppe";
import { isUuid } from "@/lib/ausbilder/gruppen";
import { ausbilderClient, fail, noStore } from "@/lib/ausbilder/server";

export const dynamic = "force-dynamic";

type InviteRow = { member_id: string; display_name: string; code: string };

const NOT_CONFIGURED = "Einladungen sind noch nicht eingerichtet.";

/** Offene Einladungen der eigenen Gruppe (SIN-356). Row Level Security lässt nur die eigene durch. */
export async function GET(request: Request) {
  const auth = await ausbilderClient(request, NOT_CONFIGURED);
  if ("response" in auth) return auth.response;

  const groupId = new URL(request.url).searchParams.get("gruppe");
  if (groupId !== null && !isUuid(groupId)) return fail("Bitte prüfen Sie Ihre Angaben.", 400);
  let query = auth.client.from("group_invitations").select("code, member_id, group_members(display_name)");
  if (groupId) query = query.eq("group_id", groupId);
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) return fail("Die Einladungen konnten nicht geladen werden.", 503);

  const invitations: Invitation[] = (
    (data ?? []) as unknown as Array<{
      code: string;
      member_id: string;
      group_members: { display_name: string } | null;
    }>
  ).map((r) => ({ memberId: r.member_id, name: r.group_members?.display_name ?? "", code: r.code }));
  return Response.json({ invitations }, { headers: noStore });
}

/**
 * Einladungen erzeugen (SIN-356): je Name ein Platz in der Gruppe und ein Beitrittscode.
 * Es wird nichts versendet; die Ausbilder geben die Codes selbst weiter.
 */
export async function POST(request: Request) {
  const auth = await ausbilderClient(request, NOT_CONFIGURED);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as { names?: unknown; groupId?: unknown } | null;
  const names = checkNames(body?.names);
  if (!names.ok) return fail(names.error, 400);
  // Mit mehreren Gruppen (SIN-415) gehört jede Einladung zu einer bestimmten, aktiven Gruppe.
  if (body?.groupId !== undefined && !isUuid(body.groupId)) return fail("Bitte prüfen Sie Ihre Angaben.", 400);
  const groupId = body?.groupId;

  const invitations: Invitation[] = [];
  for (const name of names.value) {
    const { data, error } = await auth.client.rpc(
      "ausbilder_einladung_erzeugen",
      groupId ? { p_group_id: groupId, p_display_name: name } : { p_display_name: name },
    );
    if (error) {
      // Bereits erzeugte Einladungen bleiben gültig; die Antwort nennt sie, damit nichts verloren geht.
      const message =
        error.code === "P0002"
          ? "Legen Sie zuerst eine Gruppe an."
          : error.code === "54000"
            ? "Die Gruppe ist voll (höchstens 100 Teilnehmende)."
            : error.code === "54001"
              ? "Es sind nicht genug Zugänge frei. Mehr Zugänge bekommen Sie auf Anfrage."
            : error.code === "42501"
              ? "Dieser Zugang ist kein Ausbilder-Zugang."
              : error.code === "22023"
                ? "Bitte prüfen Sie die Namen."
                : "Die Einladungen konnten nicht erzeugt werden. Bitte versuchen Sie es noch einmal.";
      const status = error.code === "P0002" ? 404 : error.code === "42501" ? 403 : error.code === "22023" ? 400 : error.code === "54000" || error.code === "54001" ? 409 : 503;
      return Response.json({ error: message, invitations }, { status, headers: noStore });
    }
    const row = (data as InviteRow[] | null)?.[0];
    if (row) invitations.push({ memberId: row.member_id, name: row.display_name, code: row.code });
  }
  return Response.json({ invitations }, { status: 201, headers: noStore });
}
