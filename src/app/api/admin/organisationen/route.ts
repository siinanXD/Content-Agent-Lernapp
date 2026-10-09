import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/admin/server";
import {
  checkOrganisationInput,
  einladungsLink,
  neuerCode,
  orgStatus,
  type OrganisationZeile,
} from "@/lib/admin/organisationen";
import { isUuid } from "@/lib/ausbilder/gruppen";
import { fail, noStore } from "@/lib/ausbilder/server";

export const dynamic = "force-dynamic";

type OrgRow = { id: string; name: string; trainer_quota: number; member_quota: number };

/** Organisationen mit vergebenen Ausbilder- und Azubi-Zugängen (SIN-416, X1). Nur Admin. */
export async function GET(request: Request) {
  const auth = await adminClient(request);
  if ("response" in auth) return auth.response;
  const db = auth.client;

  const [orgs, links, groups, members] = await Promise.all([
    db.from("organisations").select("id, name, trainer_quota, member_quota").order("created_at", { ascending: false }),
    db.from("trainer_access_links").select("organisation_id").not("redeemed_at", "is", null),
    db.from("trainer_groups").select("id, organisation_id").is("archived_at", null).not("organisation_id", "is", null),
    db.from("group_members").select("group_id"),
  ]);
  if (orgs.error || links.error || groups.error || members.error) {
    return fail("Die Organisationen konnten nicht geladen werden.", 503);
  }

  const trainers = new Map<string, number>();
  for (const l of links.data as Array<{ organisation_id: string }>) {
    trainers.set(l.organisation_id, (trainers.get(l.organisation_id) ?? 0) + 1);
  }
  const groupOrg = new Map(
    (groups.data as Array<{ id: string; organisation_id: string }>).map((g) => [g.id, g.organisation_id]),
  );
  const used = new Map<string, number>();
  for (const m of members.data as Array<{ group_id: string }>) {
    const org = groupOrg.get(m.group_id);
    if (org) used.set(org, (used.get(org) ?? 0) + 1);
  }

  const organisationen = (orgs.data as OrgRow[]).map((o): OrganisationZeile => {
    const z = {
      id: o.id,
      name: o.name,
      trainerQuota: o.trainer_quota,
      trainersUsed: trainers.get(o.id) ?? 0,
      memberQuota: o.member_quota,
      membersUsed: used.get(o.id) ?? 0,
    };
    return { ...z, status: orgStatus(z) };
  });
  return Response.json({ organisationen }, { headers: noStore });
}

async function linkAnlegen(db: SupabaseClient, organisationId: string, origin: string): Promise<string | null> {
  const code = neuerCode();
  const { error } = await db.from("trainer_access_links").insert({ organisation_id: organisationId, code });
  return error ? null : einladungsLink(origin, code);
}

/**
 * Neue Organisation anlegen (Name, E-Mail, Kontingent) und den Einladungslink für den Ausbilder
 * erzeugen; mit `{ organisationId }` nur einen weiteren Link für eine bestehende Organisation.
 * Der Link wird dem Admin angezeigt, er gibt ihn weiter.
 */
export async function POST(request: Request) {
  const auth = await adminClient(request);
  if ("response" in auth) return auth.response;
  const db = auth.client;
  const origin = new URL(request.url).origin;
  const body: unknown = await request.json().catch(() => null);

  const vorhanden = (body as { organisationId?: unknown } | null)?.organisationId;
  if (vorhanden !== undefined) {
    if (!isUuid(vorhanden)) return fail("Bitte prüfen Sie Ihre Angaben.", 400);
    const org = await db.from("organisations").select("id").eq("id", vorhanden).maybeSingle();
    if (org.error) return fail("Der Link konnte nicht erzeugt werden.", 503);
    if (!org.data) return fail("Diese Organisation gibt es nicht.", 404);
    const link = await linkAnlegen(db, vorhanden, origin);
    return link
      ? Response.json({ link }, { status: 201, headers: noStore })
      : fail("Der Link konnte nicht erzeugt werden.", 503);
  }

  const input = checkOrganisationInput(body);
  if (!input.ok) return fail(input.error, 400);
  const created = await db
    .from("organisations")
    .insert({
      name: input.value.name,
      contact_email: input.value.contactEmail,
      trainer_quota: input.value.trainerQuota,
      member_quota: input.value.memberQuota,
    })
    .select("id")
    .single();
  if (created.error || !created.data) return fail("Die Organisation konnte nicht angelegt werden.", 503);
  const id = (created.data as { id: string }).id;
  const link = await linkAnlegen(db, id, origin);
  if (!link) return fail("Die Organisation ist angelegt, der Link nicht. Bitte „Link erneut“ wählen.", 503);
  return Response.json({ id, link }, { status: 201, headers: noStore });
}
