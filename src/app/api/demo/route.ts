import {
  notifyDemoRequest,
  saveDemoRequest,
  validateDemoRequest,
} from "@/lib/demo/demo-request";

const MAX_BODY = 8_000;

/** Demo-Zugang anfragen (SIN-277): speichert die Anfrage, meldet sie Sinan. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return Response.json({ error: "Anfrage zu groß." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honigtopf: Menschen sehen das Feld nicht. Bots bekommen „ok“, nichts wird gespeichert.
  if (
    body &&
    typeof body === "object" &&
    String((body as Record<string, unknown>).website ?? "").trim() !== ""
  ) {
    return Response.json({ ok: true }, { status: 201 });
  }

  const result = validateDemoRequest(body);
  if (!result.ok) {
    return Response.json({ error: "Bitte Eingaben prüfen.", fields: result.errors }, { status: 400 });
  }

  try {
    await saveDemoRequest(result.value);
  } catch {
    return Response.json(
      { error: "Die Anfrage konnte nicht gespeichert werden. Bitte später erneut versuchen." },
      { status: 503 },
    );
  }

  // Die Anfrage ist gespeichert; eine fehlgeschlagene Meldung macht sie nicht ungültig.
  await notifyDemoRequest(result.value).catch(() => false);
  return Response.json({ ok: true }, { status: 201 });
}
