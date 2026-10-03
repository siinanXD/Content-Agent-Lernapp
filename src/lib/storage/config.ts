/**
 * Storage backend selection. Never logs secret values.
 */
export function supabaseSecretsPresent(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && service);
}

export function preferMockStorage(): boolean {
  const forced = process.env.COURSE_STORAGE?.trim().toLowerCase();
  if (forced === "mock") return true;
  if (forced === "supabase") return false;
  return !supabaseSecretsPresent();
}
