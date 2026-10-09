import { createClient } from "@supabase/supabase-js";
import { fail, noStore } from "@/lib/ausbilder/server";
import { checkCode, checkZugangInput } from "@/lib/ausbilder/zugang";
import { getServiceSupabase } from "@/lib/storage/supabase-client";
import { supabaseSecretsPresent } from "@/lib/storage/config";

export const dynamic = "force-dynamic";

const NOT_CONFIGURED = "Der Zugang ist noch nicht eingerichtet.";
const INVALID_LINK = "Dieser Link ist nicht gültig oder wurde schon benutzt.";

type PreviewRow = { organisation: string; trainer_quota: number; member_quota: number };

/**
 * Einladungslink prüfen (SIN-415, G0): zeigt Organisation und Kontingent, verändert nichts.
 * Läuft mit dem Service-Role-Key, nur auf dem Server; die Funktionen sind nur dafür freigegeben.
 */
export async function GET(request: Request) {
  const code = checkCode(new URL(request.url).searchParams.get("code"));
  if (!code.ok) return fail(INVALID_LINK, 404);
  if (!supabaseSecretsPresent()) return fail(NOT_CONFIGURED, 503);

  const { data, error } = await getServiceSupabase().rpc("zugang_pruefen", { p_code: code.value });
  if (error) return fail("Der Link konnte nicht geprüft werden. Bitte versuchen Sie es noch einmal.", 503);
  const row = ((data ?? []) as PreviewRow[])[0];
  if (!row) return fail(INVALID_LINK, 404);
  return Response.json(
    { organisation: row.organisation, trainerQuota: row.trainer_quota, memberQuota: row.member_quota },
    { headers: noStore },
  );
}

/**
 * Zugang einlösen (SIN-415, G0): Link reservieren, Konto mit Rolle `ausbilder` anlegen, der
 * Organisation zuordnen und den Anmelde-Link per E-Mail senden. Die Rolle steht in `app_metadata`
 * (nur serverseitig setzbar). Geht ein Schritt schief, wird der Link wieder freigegeben.
 */
export async function POST(request: Request) {
  const input = checkZugangInput(await request.json().catch(() => null));
  if (!input.ok) return fail(input.error, 400);
  if (!supabaseSecretsPresent()) return fail(NOT_CONFIGURED, 503);
  const anonUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonUrl || !anonKey) return fail(NOT_CONFIGURED, 503);

  const { code, email } = input.value;
  const service = getServiceSupabase();

  const reserved = await service.rpc("zugang_reservieren", { p_code: code });
  if (reserved.error) return fail("Der Zugang konnte nicht aktiviert werden. Bitte versuchen Sie es noch einmal.", 503);
  const org = ((reserved.data ?? []) as Array<{ organisation_id: string }>)[0];
  if (!org) return fail(INVALID_LINK, 410);

  const release = () => service.rpc("zugang_freigeben", { p_code: code });

  const created = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "ausbilder", organisation_id: org.organisation_id },
  });
  if (created.error || !created.data.user) {
    await release();
    const exists = created.error?.code === "email_exists" || created.error?.status === 422;
    return exists
      ? fail("Mit dieser Adresse besteht schon ein Zugang. Bitte melden Sie sich an.", 409)
      : fail("Der Zugang konnte nicht aktiviert werden. Bitte versuchen Sie es noch einmal.", 503);
  }

  const assigned = await service.rpc("zugang_zuordnen", { p_code: code, p_user: created.data.user.id });
  if (assigned.error) {
    // Das Konto bleibt ohne Organisation bestehen; der Link wird nicht freigegeben, damit nichts doppelt läuft.
    return fail("Der Zugang konnte nicht zugeordnet werden. Bitte wenden Sie sich an uns.", 503);
  }

  const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: mailError } = await anon.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${new URL(request.url).origin}/ausbilder/gruppen`,
    },
  });
  // Der Zugang steht; kommt keine E-Mail, genügt „Anmelden“ mit derselben Adresse.
  return Response.json({ ok: true, mailSent: !mailError }, { status: 201, headers: noStore });
}
