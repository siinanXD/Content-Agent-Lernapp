import { aboConfig, readAboStatus } from "@/lib/abo/abo";

/** Stand der Abo-Sitzung für die Bestätigungsseite (SIN-771). */
export async function GET(request: Request) {
  const config = aboConfig();
  // Nicht eingerichtet ist kein Fehler: Die Seite lädt auch ohne Stripe fehlerfrei (Testnutzer).
  if (!config.ok) return Response.json({ status: "unbekannt" });
  const id = new URL(request.url).searchParams.get("session_id") ?? "";
  try {
    return Response.json({ status: await readAboStatus(config, id) });
  } catch {
    return Response.json({ status: "unbekannt" }, { status: 502 });
  }
}
