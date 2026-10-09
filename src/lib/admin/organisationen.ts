/**
 * Admin: Organisationen und Zugänge (SIN-416, Figma X1). Reine Funktionen: Eingaben prüfen,
 * Status bestimmen, Antworten lesen. Die Organisation trägt nur den Namen des Bildungsträgers
 * und die geschäftliche E-Mail der Ansprechperson.
 */
import type { Checked } from "@/lib/ausbilder/gruppe";

export const NAME_MAX = 200;
export const TRAINER_QUOTA_MAX = 50;
export const MEMBER_QUOTA_MAX = 500;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type OrganisationInput = {
  name: string;
  contactEmail: string;
  trainerQuota: number;
  memberQuota: number;
};

export type OrgStatus = "Eingeladen" | "Aktiv" | "Voll";

export type OrganisationZeile = {
  id: string;
  name: string;
  trainerQuota: number;
  trainersUsed: number;
  memberQuota: number;
  membersUsed: number;
  status: OrgStatus;
};

export type Anfrage = {
  id: string;
  organisation: string;
  contactName: string;
  email: string;
  participants: number;
  schwerpunkt: string;
  createdAt: string;
};

export type KursZeile = { id: string; keyword: string; status: string; mock: boolean; createdAt: string };

function whole(raw: unknown): number | null {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  return typeof n === "number" && Number.isInteger(n) ? n : null;
}

export function checkOrganisationInput(raw: unknown): Checked<OrganisationInput> {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof d.name === "string" ? d.name.trim() : "";
  if (!name) return { ok: false, error: "Bitte geben Sie den Namen des Bildungsträgers an." };
  if (name.length > NAME_MAX) return { ok: false, error: `Der Name darf höchstens ${NAME_MAX} Zeichen haben.` };
  const contactEmail = typeof d.contactEmail === "string" ? d.contactEmail.trim().toLowerCase() : "";
  if (!contactEmail || contactEmail.length > 254 || !EMAIL_FORMAT.test(contactEmail)) {
    return { ok: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse an." };
  }
  const trainerQuota = whole(d.trainerQuota);
  if (trainerQuota === null || trainerQuota < 1 || trainerQuota > TRAINER_QUOTA_MAX) {
    return { ok: false, error: `Ausbilder: eine ganze Zahl von 1 bis ${TRAINER_QUOTA_MAX}.` };
  }
  const memberQuota = whole(d.memberQuota);
  if (memberQuota === null || memberQuota < 0 || memberQuota > MEMBER_QUOTA_MAX) {
    return { ok: false, error: `Azubi-Zugänge: eine ganze Zahl von 0 bis ${MEMBER_QUOTA_MAX}.` };
  }
  return { ok: true, value: { name, contactEmail, trainerQuota, memberQuota } };
}

/** Eingeladen: noch kein Ausbilder hat den Link eingelöst. Voll: Ausbilder- und Azubi-Zugänge ausgeschöpft. */
export function orgStatus(
  o: Pick<OrganisationZeile, "trainerQuota" | "trainersUsed" | "memberQuota" | "membersUsed">,
): OrgStatus {
  if (o.trainersUsed === 0) return "Eingeladen";
  if (o.trainersUsed >= o.trainerQuota && o.membersUsed >= o.memberQuota) return "Voll";
  return "Aktiv";
}

export const vonText = (used: number, quota: number) => `${used} von ${quota}`;

export function summe(zeilen: OrganisationZeile[]) {
  return zeilen.reduce(
    (s, z) => ({
      trainersUsed: s.trainersUsed + z.trainersUsed,
      trainerQuota: s.trainerQuota + z.trainerQuota,
      membersUsed: s.membersUsed + z.membersUsed,
      memberQuota: s.memberQuota + z.memberQuota,
    }),
    { trainersUsed: 0, trainerQuota: 0, membersUsed: 0, memberQuota: 0 },
  );
}

/** Aktion je Status wie in Figma: Aktiv „Link senden“, Eingeladen „Link erneut“, Voll „Erhöhen“. */
export function aktionsText(status: OrgStatus): string {
  return status === "Eingeladen" ? "Link erneut" : status === "Voll" ? "Erhöhen" : "Link senden";
}

export function einladungsLink(origin: string, code: string): string {
  return `${origin}/ausbilder/zugang?code=${encodeURIComponent(code)}`;
}

/** Zugangscode: 24 Zeichen, URL-sicher, aus zufälligen Bytes. */
export function neuerCode(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64url");
}
