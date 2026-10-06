import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Supabase-Client für den Browser mit dem öffentlichen Anon-Key (Anmeldung per Magic-Link).
 * Nie der Service-Role-Key. Ohne NEXT_PUBLIC_SUPABASE_URL/-ANON_KEY: `null`, die Seiten zeigen dann
 * „Anmeldung nicht eingerichtet“.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  cached = url && key ? createClient(url, key) : null;
  return cached;
}

/** Zugriffstoken der angemeldeten Person, sonst `null`. */
export async function getAccessToken(): Promise<string | null> {
  const client = getBrowserSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  await getBrowserSupabase()?.auth.signOut();
}
