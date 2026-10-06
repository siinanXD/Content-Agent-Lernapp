import type { SupabaseClient } from "@supabase/supabase-js";

let cached: Promise<SupabaseClient | null> | undefined;

/**
 * Supabase-Client für den Browser mit dem öffentlichen Anon-Key (Anmeldung per Magic-Link).
 * Nie der Service-Role-Key. Ohne NEXT_PUBLIC_SUPABASE_URL/-ANON_KEY: `null`, die Seiten zeigen dann
 * „Anmeldung nicht eingerichtet“. Die Bibliothek wird erst bei Bedarf geladen (SIN-286): sonst
 * liegt sie in jedem Bundle, auch ohne Konfiguration, und kostet Ladezeit.
 */
export function getBrowserSupabase(): Promise<SupabaseClient | null> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  cached =
    url && key
      ? import("@supabase/supabase-js").then(({ createClient }) => createClient(url, key))
      : Promise.resolve(null);
  return cached;
}

/** Zugriffstoken der angemeldeten Person, sonst `null`. */
export async function getAccessToken(): Promise<string | null> {
  const client = await getBrowserSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  await (await getBrowserSupabase())?.auth.signOut();
}
