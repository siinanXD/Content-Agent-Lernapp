import { cleanEnvValue } from "@/lib/env";

/**
 * Abo über Stripe Checkout, nur Testmodus (SIN-771). Kein SDK: zwei REST-Aufrufe.
 * Ein Live-Schlüssel (`sk_live_…`) wird abgelehnt; den Live-Schalter legt nur Sinan um.
 * Preis und Schlüssel kommen aus der Umgebung, die App erfindet keinen Preis.
 */

const API = "https://api.stripe.com/v1/checkout/sessions";
const SESSION_ID = /^cs_test_[A-Za-z0-9_]{8,200}$/;

export type AboConfig =
  | { ok: true; secret: string; priceId: string }
  | { ok: false; reason: "nicht-eingerichtet" | "kein-testschluessel" };

export function aboConfig(env: Record<string, string | undefined> = process.env): AboConfig {
  const secret = cleanEnvValue(env.STRIPE_SECRET_KEY);
  const priceId = cleanEnvValue(env.STRIPE_PRICE_ID);
  if (!secret || !priceId) return { ok: false, reason: "nicht-eingerichtet" };
  if (!secret.startsWith("sk_test_") && !secret.startsWith("rk_test_")) {
    return { ok: false, reason: "kein-testschluessel" };
  }
  return { ok: true, secret, priceId };
}

export function isTestSessionId(id: string): boolean {
  return SESSION_ID.test(id);
}

type Fetch = typeof fetch;
const headers = (secret: string) => ({ Authorization: `Bearer ${secret}` });

/** Legt eine Checkout-Sitzung im Abo-Modus an und gibt die Stripe-Adresse zurück. */
export async function createAboSession(
  config: Extract<AboConfig, { ok: true }>,
  origin: string,
  fetchFn: Fetch = fetch,
): Promise<string | null> {
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": config.priceId,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/abo/bestaetigung?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/abo`,
  });
  const res = await fetchFn(API, { method: "POST", headers: headers(config.secret), body });
  if (!res.ok) return null;
  const json = (await res.json()) as { url?: unknown; livemode?: unknown };
  if (json.livemode === true || typeof json.url !== "string") return null;
  return json.url;
}

export type AboStatus = "bestaetigt" | "offen" | "unbekannt";

/** Liest den Stand einer Testsitzung. Abo gilt als bestätigt, wenn die Sitzung abgeschlossen ist. */
export async function readAboStatus(
  config: Extract<AboConfig, { ok: true }>,
  sessionId: string,
  fetchFn: Fetch = fetch,
): Promise<AboStatus> {
  if (!isTestSessionId(sessionId)) return "unbekannt";
  const res = await fetchFn(`${API}/${sessionId}`, { headers: headers(config.secret) });
  if (!res.ok) return "unbekannt";
  const json = (await res.json()) as { status?: unknown; livemode?: unknown };
  if (json.livemode === true) return "unbekannt";
  return json.status === "complete" ? "bestaetigt" : "offen";
}
