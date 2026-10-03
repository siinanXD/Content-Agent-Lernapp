import { getStorageBackend, supabaseSecretsPresent } from "@/lib/storage";

export function getHealth() {
  return {
    ok: true as const,
    service: "content-agent-lernapp",
    storage: getStorageBackend(),
    supabaseConfigured: supabaseSecretsPresent(),
  };
}
