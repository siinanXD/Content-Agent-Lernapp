import { getAccessToken } from "@/lib/auth/browser-client";

/** Anfrage an die Ausbilder-API mit dem Token der angemeldeten Person (SIN-415). */
export async function ausbilderFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
