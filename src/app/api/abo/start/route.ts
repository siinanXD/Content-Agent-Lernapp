import { aboConfig, createAboSession } from "@/lib/abo/abo";

/** Startet das Abo im Testmodus (SIN-771): leitet zu Stripe Checkout weiter. */
export async function POST(request: Request) {
  const config = aboConfig();
  if (!config.ok) {
    return Response.json({ error: config.reason }, { status: 503 });
  }
  try {
    const url = await createAboSession(config, new URL(request.url).origin);
    if (!url) return Response.json({ error: "fehler" }, { status: 502 });
    return Response.json({ url });
  } catch {
    return Response.json({ error: "fehler" }, { status: 502 });
  }
}
