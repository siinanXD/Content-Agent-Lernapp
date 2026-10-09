/**
 * Meine Gruppen, Archiv und Zugänge (SIN-415, Figma G5 bis G7). Reine Funktionen: Antworten lesen
 * und Texte bauen. Archivierte Gruppen bleiben lesbar und belegen keine Zugänge.
 */
import { formatDate } from "@/lib/ausbilder/overview";

export type GroupSummary = {
  id: string;
  name: string;
  schwerpunkt: string;
  startsOn: string | null;
  examDate: string | null;
  /** ISO-Zeitpunkt der Archivierung, `null` bei aktiven Gruppen. */
  archivedAt: string | null;
  memberCount: number;
  /** Durchschnittlicher Fortschritt der Gruppe, 0–100. */
  avgPercent: number;
};

export type Zugaenge = {
  organisation: string;
  trainerQuota: number;
  memberQuota: number;
  used: number;
};

export type Gruppen = { groups: GroupSummary[]; zugaenge: Zugaenge | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function parseGruppen(data: unknown): Gruppen | null {
  const d = data as { groups?: unknown; zugaenge?: unknown } | null;
  if (!d || !Array.isArray(d.groups)) return null;
  const groups = d.groups.flatMap((raw): GroupSummary[] => {
    const g = raw as Record<string, unknown>;
    const memberCount = num(g?.memberCount);
    const avgPercent = num(g?.avgPercent);
    if (!isUuid(g?.id) || typeof g.name !== "string" || typeof g.schwerpunkt !== "string") return [];
    if (memberCount === null || avgPercent === null) return [];
    return [
      {
        id: g.id,
        name: g.name,
        schwerpunkt: g.schwerpunkt,
        startsOn: str(g.startsOn),
        examDate: str(g.examDate),
        archivedAt: str(g.archivedAt),
        memberCount,
        avgPercent,
      },
    ];
  });
  const z = d.zugaenge as Record<string, unknown> | null | undefined;
  const trainerQuota = num(z?.trainerQuota);
  const memberQuota = num(z?.memberQuota);
  const used = num(z?.used);
  const zugaenge =
    z && typeof z.organisation === "string" && trainerQuota !== null && memberQuota !== null && used !== null
      ? { organisation: z.organisation, trainerQuota, memberQuota, used }
      : null;
  return { groups, zugaenge };
}

export const aktive = (groups: GroupSummary[]) => groups.filter((g) => !g.archivedAt);
export const archivierte = (groups: GroupSummary[]) => groups.filter((g) => g.archivedAt);

/** „28 von 40“. */
export function vergebenText(z: Zugaenge): string {
  return `${z.used} von ${z.memberQuota}`;
}

export function freiAnzahl(z: Zugaenge): number {
  return Math.max(0, z.memberQuota - z.used);
}

export function freiText(z: Zugaenge): string {
  return `${freiAnzahl(z)} frei. Mehr Zugänge bekommen Sie auf Anfrage.`;
}

/** Füllstand des Balkens, 0–100. */
export function belegtProzent(z: Zugaenge): number {
  return z.memberQuota <= 0 ? 0 : Math.min(100, Math.round((100 * z.used) / z.memberQuota));
}

export function teilnehmendeText(n: number): string {
  return n === 1 ? "1 Teilnehmende" : `${n} Teilnehmende`;
}

export function aktiveGruppenText(organisation: string | null, n: number): string {
  const gruppen = n === 1 ? "1 aktive Gruppe" : `${n} aktive Gruppen`;
  return organisation ? `${organisation} · ${gruppen}` : gruppen;
}

/** Folgen des Archivierens (Figma G6). */
export function archivierenFolgen(memberCount: number, mitKontingent: boolean): string[] {
  const folgen = ["Fortschritt und Lernzeit bleiben im Archiv lesbar."];
  if (mitKontingent && memberCount > 0) {
    folgen.push(
      memberCount === 1 ? "Der 1 Zugang wird wieder frei." : `Die ${memberCount} Zugänge werden wieder frei.`,
    );
  }
  folgen.push("Die Azubis sehen die Gruppe danach nicht mehr.");
  folgen.push("Sie können die Gruppe wiederherstellen, solange Zugänge frei sind.");
  return folgen;
}

/** Zeitraum im Archiv: „04.11.2025 – 30.06.2026“. Ohne Beginn nur das Ende. */
export function archivZeitraum(g: GroupSummary): string {
  const ende = g.archivedAt ? formatDate(g.archivedAt.slice(0, 10)) : "";
  return g.startsOn ? `${formatDate(g.startsOn)} – ${ende}` : `bis ${ende}`;
}

/** Datenbank-Fehlercodes in verständlichen Text und HTTP-Status. */
export function aktionFehler(code: string | undefined): { text: string; status: number } {
  switch (code) {
    case "42501":
      return { text: "Dieser Zugang ist kein Ausbilder-Zugang.", status: 403 };
    case "P0002":
      return { text: "Diese Gruppe gibt es nicht oder sie ist schon im gewünschten Zustand.", status: 404 };
    case "54001":
      return { text: "Es sind nicht genug Zugänge frei. Mehr Zugänge bekommen Sie auf Anfrage.", status: 409 };
    default:
      return { text: "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.", status: 503 };
  }
}
