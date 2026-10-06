import { getStorageBackend, supabaseSecretsPresent } from "@/lib/storage";
import { getServiceSupabase } from "@/lib/storage/supabase-client";

export function getHealth() {
  return {
    ok: true as boolean,
    service: "content-agent-lernapp",
    storage: getStorageBackend(),
    supabaseConfigured: supabaseSecretsPresent(),
  };
}

export type DbState = "ok" | "mock" | "unreachable";

const DB_TIMEOUT_MS = 4000;

type Ping = () => PromiseLike<{ error: unknown }>;

/** Supabase: eine Zeile aus `courses` lesen. Mock-Speicher hat keine DB und gilt als erreichbar. */
export async function checkDatabase(
  backend: string = getStorageBackend(),
  ping: Ping = () => getServiceSupabase().from("courses").select("id").limit(1),
  timeoutMs = DB_TIMEOUT_MS,
): Promise<DbState> {
  if (backend !== "supabase") return "mock";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });
    const { error } = await Promise.race([ping(), timeout]);
    return error ? "unreachable" : "ok";
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}

/** Antwort für /api/health: 200 nur, wenn auch die Datenbank antwortet; sonst 503 (cron-job.org meldet das per E-Mail). */
export async function getHealthReport(db?: DbState) {
  const state = db ?? (await checkDatabase());
  const body = { ...getHealth(), db: state, ok: state !== "unreachable" };
  return { status: body.ok ? 200 : 503, body };
}
