import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fail } from "@/lib/ausbilder/server";
import { supabaseSecretsPresent } from "@/lib/storage/config";
import { getServiceSupabase } from "@/lib/storage/supabase-client";

/**
 * Admin-Zugriff (SIN-416): prüft bei jeder Anfrage das Token und die Rolle `admin` in
 * `app_metadata` (nur mit dem Service-Role-Key setzbar). Erst danach gibt es den Service-Client
 * zurück, der nur auf dem Server läuft. Fehlt Token, Konfiguration oder Rolle, kommt gleich die Antwort.
 */
export async function adminClient(
  request: Request,
): Promise<{ client: SupabaseClient } | { response: Response }> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return { response: fail("Bitte anmelden.", 401) };

  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon || !supabaseSecretsPresent()) {
    return { response: fail("Der Admin-Bereich ist noch nicht eingerichtet.", 503) };
  }

  const probe = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await probe.auth.getUser(token);
  if (error || !data.user) return { response: fail("Bitte anmelden.", 401) };
  if (data.user.app_metadata?.role !== "admin") {
    return { response: fail("Dieser Bereich ist nur für den Admin.", 403) };
  }
  return { client: getServiceSupabase() };
}
