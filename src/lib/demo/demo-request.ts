/**
 * Demo-Zugang anfragen (Screen 20, SIN-277): Prüfung, Speicherung, Benachrichtigung.
 * Die Einwilligung ist Pflicht. Die Benachrichtigung an Sinan enthält keine Personendaten
 * (nur Träger, Anzahl, Schwerpunkt); Name und E-Mail stehen nur in der Datenbank.
 */
import { preferMockStorage } from "@/lib/storage/config";
import { getServiceSupabase } from "@/lib/storage/supabase-client";

export type DemoRequest = {
  organisation: string;
  contactName: string;
  email: string;
  participants: number;
  schwerpunkt: string;
  consent: true;
};

export type DemoField =
  | "organisation"
  | "contactName"
  | "email"
  | "participants"
  | "schwerpunkt"
  | "consent";

export type DemoValidation =
  | { ok: true; value: DemoRequest }
  | { ok: false; errors: Partial<Record<DemoField, string>> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validateDemoRequest(body: unknown): DemoValidation {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const errors: Partial<Record<DemoField, string>> = {};

  const organisation = text(b.organisation);
  if (!organisation) errors.organisation = "Bitte den Bildungsträger angeben.";
  else if (organisation.length > 200) errors.organisation = "Bitte höchstens 200 Zeichen.";

  const contactName = text(b.contactName);
  if (!contactName) errors.contactName = "Bitte Vor- und Nachname angeben.";
  else if (contactName.length > 200) errors.contactName = "Bitte höchstens 200 Zeichen.";

  const email = text(b.email);
  if (!EMAIL.test(email) || email.length > 254) {
    errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
  }

  const participants = typeof b.participants === "number" ? b.participants : Number(text(b.participants));
  if (!Number.isInteger(participants) || participants < 1 || participants > 500) {
    errors.participants = "Bitte eine Zahl von 1 bis 500 angeben.";
  }

  const schwerpunkt = text(b.schwerpunkt);
  if (!schwerpunkt) errors.schwerpunkt = "Bitte einen Schwerpunkt angeben.";
  else if (schwerpunkt.length > 200) errors.schwerpunkt = "Bitte höchstens 200 Zeichen.";

  if (b.consent !== true) errors.consent = "Ohne Einwilligung können wir die Anfrage nicht speichern.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { organisation, contactName, email, participants, schwerpunkt, consent: true },
  };
}

/** Nur für Tests und den Mock-Betrieb (COURSE_STORAGE=mock). */
export const mockDemoRequests: DemoRequest[] = [];

export async function saveDemoRequest(req: DemoRequest): Promise<void> {
  if (preferMockStorage()) {
    mockDemoRequests.push(req);
    return;
  }
  const { error } = await getServiceSupabase().from("demo_requests").insert({
    organisation: req.organisation,
    contact_name: req.contactName,
    email: req.email,
    participants: req.participants,
    schwerpunkt: req.schwerpunkt,
    consent: true,
  });
  if (error) throw new Error(`demo_requests: ${error.message}`);
}

/** Meldung an Sinan über Telegram (Secrets wie beim Tages-Update). Ohne Secrets: false, kein Fehler. */
export async function notifyDemoRequest(
  req: DemoRequest,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chat) return false;
  const message = `Neue Demo-Anfrage: ${req.organisation}, ca. ${req.participants} Teilnehmende, ${req.schwerpunkt}. Kontakt steht in Supabase (demo_requests).`;
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: message }),
  });
  return res.ok;
}
