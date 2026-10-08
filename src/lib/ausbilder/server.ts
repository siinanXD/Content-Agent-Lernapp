import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const noStore = { "Cache-Control": "no-store" };

export function fail(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: noStore });
}

/**
 * Client mit dem Token der angemeldeten Ausbilder (SIN-277, SIN-356). Läuft mit dem Anon-Key,
 * nie mit dem Service-Role-Key: Row Level Security und die Funktionen prüfen Rolle und Gruppe.
 * Liefert bei fehlendem Token, fehlender Konfiguration oder falscher Rolle gleich die Antwort.
 */
export async function ausbilderClient(
  request: Request,
  notConfigured: string,
): Promise<{ client: SupabaseClient } | { response: Response }> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return { response: fail("Bitte anmelden.", 401) };

  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return { response: fail(notConfigured, 503) };

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: auth, error } = await client.auth.getUser(token);
  if (error || !auth.user) return { response: fail("Bitte anmelden.", 401) };
  if (auth.user.app_metadata?.role !== "ausbilder") {
    return { response: fail("Dieser Zugang ist kein Ausbilder-Zugang.", 403) };
  }
  return { client };
}
