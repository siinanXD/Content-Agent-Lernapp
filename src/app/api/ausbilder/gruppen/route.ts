import { aktionFehler, isUuid } from "@/lib/ausbilder/gruppen";
import { ausbilderClient, fail, noStore } from "@/lib/ausbilder/server";

export const dynamic = "force-dynamic";

type GroupRow = {
  group_id: string;
  name: string;
  schwerpunkt: string;
  starts_on: string | null;
  exam_date: string | null;
  archived_at: string | null;
  member_count: number;
  avg_percent: number;
};

type ZugangRow = {
  organisation: string;
  trainer_quota: number;
  member_quota: number;
  members_used: number;
};

const NOT_CONFIGURED = "Die Gruppen sind noch nicht eingerichtet.";

/**
 * Meine Gruppen (SIN-415): aktive und archivierte mit Zugängen der Organisation. Läuft mit dem
 * Anon-Key und dem Token der Person; die Datenbankfunktionen liefern nur die eigenen Gruppen.
 */
export async function GET(request: Request) {
  const auth = await ausbilderClient(request, NOT_CONFIGURED);
  if ("response" in auth) return auth.response;

  const [groups, zugaenge] = await Promise.all([
    auth.client.rpc("ausbilder_gruppen"),
    auth.client.rpc("ausbilder_zugaenge"),
  ]);
  if (groups.error || zugaenge.error) return fail("Die Gruppen konnten nicht geladen werden.", 503);

  const z = ((zugaenge.data ?? []) as ZugangRow[])[0];
  return Response.json(
    {
      groups: ((groups.data ?? []) as GroupRow[]).map((g) => ({
        id: g.group_id,
        name: g.name,
        schwerpunkt: g.schwerpunkt,
        startsOn: g.starts_on,
        examDate: g.exam_date,
        archivedAt: g.archived_at,
        memberCount: g.member_count,
        avgPercent: g.avg_percent,
      })),
      zugaenge: z
        ? {
            organisation: z.organisation,
            trainerQuota: z.trainer_quota,
            memberQuota: z.member_quota,
            used: z.members_used,
          }
        : null,
    },
    { headers: noStore },
  );
}

/**
 * Archivieren oder wiederherstellen (SIN-415). Nichts wird gelöscht. Besitz, Rolle und das
 * Kontingent beim Wiederherstellen prüft die Datenbankfunktion.
 */
export async function POST(request: Request) {
  const auth = await ausbilderClient(request, NOT_CONFIGURED);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as { id?: unknown; aktion?: unknown } | null;
  if (!isUuid(body?.id) || (body?.aktion !== "archivieren" && body?.aktion !== "wiederherstellen")) {
    return fail("Bitte prüfen Sie Ihre Angaben.", 400);
  }

  const fn = body.aktion === "archivieren" ? "ausbilder_gruppe_archivieren" : "ausbilder_gruppe_wiederherstellen";
  const { error } = await auth.client.rpc(fn, { p_group_id: body.id });
  if (error) {
    const f = aktionFehler(error.code);
    return fail(f.text, f.status);
  }
  return Response.json({ ok: true }, { headers: noStore });
}
