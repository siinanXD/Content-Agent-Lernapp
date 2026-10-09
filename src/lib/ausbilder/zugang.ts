/**
 * Zugang per Einladungslink einlösen (SIN-415, Figma G0). Der Link trägt einen Code
 * (`/ausbilder/zugang?code=…`); mit der E-Mail-Adresse folgt ein Anmelde-Link, kein Passwort.
 */
import type { Checked } from "@/lib/ausbilder/gruppe";

export const CODE_MIN = 12;
export const CODE_MAX = 64;
const CODE_FORMAT = /^[A-Za-z0-9_-]+$/;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ZugangPreview = { organisation: string; trainerQuota: number; memberQuota: number };

export function checkCode(raw: unknown): Checked<string> {
  const code = typeof raw === "string" ? raw.trim() : "";
  if (code.length < CODE_MIN || code.length > CODE_MAX || !CODE_FORMAT.test(code)) {
    return { ok: false, error: "Dieser Link ist nicht gültig." };
  }
  return { ok: true, value: code };
}

export function checkZugangInput(raw: unknown): Checked<{ code: string; email: string }> {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const code = checkCode(d.code);
  if (!code.ok) return code;
  const email = typeof d.email === "string" ? d.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_FORMAT.test(email)) {
    return { ok: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse an." };
  }
  return { ok: true, value: { code: code.value, email } };
}

export function parseZugangPreview(data: unknown): ZugangPreview | null {
  const d = data as Record<string, unknown> | null;
  if (
    !d ||
    typeof d.organisation !== "string" ||
    typeof d.trainerQuota !== "number" ||
    typeof d.memberQuota !== "number"
  ) {
    return null;
  }
  return { organisation: d.organisation, trainerQuota: d.trainerQuota, memberQuota: d.memberQuota };
}
