/**
 * Gruppenübersicht für Ausbilder (Screen 19, SIN-277). Reine Funktionen ohne Datenbankzugriff.
 * Nur Fortschritt und Lernzeit. Keine KI-Bewertung von Personen (PRODUCT.md Grundsatz):
 * „Inaktiv“ und „Unter Plan“ sind feste Regeln, keine Einschätzung der Person.
 */

export type GroupInfo = {
  /** Kennung der Gruppe (SIN-415); fehlt in der Beispielansicht. */
  id?: string;
  name: string;
  schwerpunkt: string;
  /** ISO-Datum (YYYY-MM-DD) der Prüfung, falls bekannt. */
  examDate: string | null;
  /** ISO-Datum (YYYY-MM-DD) des Kursbeginns, falls bekannt. */
  startsOn: string | null;
  /** ISO-Zeitpunkt der Archivierung (SIN-415), `null` bei aktiven Gruppen. */
  archivedAt?: string | null;
};

export type MemberRow = {
  id: string;
  name: string;
  /** Anteil richtig beantworteter Fragen des Gruppenkurses, 0–100. */
  progressPercent: number;
  /** ISO-Zeitpunkt der letzten Antwort, `null` wenn noch nie aktiv. */
  lastActiveAt: string | null;
};

export type Overview = { group: GroupInfo; members: MemberRow[] };

export type MemberFilter = "alle" | "inaktiv" | "unter-plan";

/** Ab so vielen Tagen ohne Antwort gilt ein Mitglied als inaktiv (Figma: „seit 7 Tagen inaktiv“). */
export const INACTIVE_DAYS = 7;

const DAY_MS = 86_400_000;

/** Volle Kalendertage zwischen dem Zeitpunkt und jetzt (lokale Zeit), nie negativ. */
export function daysSince(iso: string, now: Date): number {
  const then = new Date(iso);
  const a = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((b - a) / DAY_MS));
}

export function isInactive(m: MemberRow, now: Date): boolean {
  return m.lastActiveAt === null || daysSince(m.lastActiveAt, now) >= INACTIVE_DAYS;
}

/**
 * Soll-Fortschritt bei gleichmäßigem Lernen zwischen Kursbeginn und Prüfung (linear, 0–100).
 * `null`, wenn die Gruppe keine beiden Daten hat: dann gibt es keinen Plan zum Vergleichen.
 */
export function expectedPercent(group: GroupInfo, now: Date): number | null {
  if (!group.startsOn || !group.examDate) return null;
  const start = new Date(`${group.startsOn}T00:00:00`).getTime();
  const end = new Date(`${group.examDate}T00:00:00`).getTime();
  if (!(end > start)) return null;
  const ratio = (now.getTime() - start) / (end - start);
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}

export function isBehindPlan(m: MemberRow, group: GroupInfo, now: Date): boolean {
  const expected = expectedPercent(group, now);
  return expected !== null && m.progressPercent < expected;
}

export function filterMembers(
  members: MemberRow[],
  filter: MemberFilter,
  group: GroupInfo,
  now: Date,
): MemberRow[] {
  if (filter === "inaktiv") return members.filter((m) => isInactive(m, now));
  if (filter === "unter-plan") return members.filter((m) => isBehindPlan(m, group, now));
  return members;
}

export function summarize(members: MemberRow[], now: Date) {
  const count = members.length;
  const avgPercent = count
    ? Math.round(members.reduce((sum, m) => sum + m.progressPercent, 0) / count)
    : 0;
  return { count, avgPercent, inactiveCount: members.filter((m) => isInactive(m, now)).length };
}

export function lastActiveLabel(m: MemberRow, now: Date): string {
  if (m.lastActiveAt === null) return "Noch nicht aktiv";
  const days = daysSince(m.lastActiveAt, now);
  if (days === 0) return "Zuletzt aktiv heute";
  if (days === 1) return "Zuletzt aktiv gestern";
  return `Zuletzt aktiv vor ${days} Tagen`;
}

export function initials(name: string): string {
  const parts = name.replace(/[.]/g, " ").trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] ?? "?"];
  return letters.map((p) => p.charAt(0).toUpperCase()).join("");
}

/** „2027-03-12“ → „12.03.2027“. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** Zelle für Excel/Calc: Anführungszeichen, und führende Formelzeichen werden entschärft. */
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** CSV mit Semikolon (deutsches Excel) und BOM. Spalten: Name, Fortschritt in %, Zuletzt aktiv, Inaktiv. */
export function toCsv(members: MemberRow[], now: Date): string {
  const rows = [
    ["Name", "Fortschritt in %", "Zuletzt aktiv", "Inaktiv"],
    ...members.map((m) => [
      m.name,
      m.progressPercent,
      m.lastActiveAt ? new Date(m.lastActiveAt).toISOString().slice(0, 10) : "",
      isInactive(m, now) ? "ja" : "nein",
    ]),
  ];
  return `﻿${rows.map((r) => r.map(csvCell).join(";")).join("\r\n")}\r\n`;
}

/**
 * E-Mail-Entwurf an die Gruppe. Es gibt keinen Versand durch die App: der Ausbilder öffnet den
 * Entwurf im eigenen Mailprogramm, trägt die Empfänger ein und sendet selbst.
 */
export function reminderMailto(group: GroupInfo): string {
  const subject = `Erinnerung: Lernpfad ${group.schwerpunkt}`;
  const body = [
    "Hallo zusammen,",
    "",
    "kurze Erinnerung: Täglich 5–10 Minuten im Lernpfad halten Sie bis zur Prüfung auf Kurs.",
    group.examDate ? `Die Prüfung ist am ${formatDate(group.examDate)}.` : "",
    "",
    "Viele Grüße",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\r\n");
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Prüft die Antwort der API; unbrauchbare Zeilen werden verworfen. */
export function parseOverview(data: unknown): Overview | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { group?: Record<string, unknown>; members?: unknown };
  const g = d.group;
  if (!g || typeof g.name !== "string" || typeof g.schwerpunkt !== "string") return null;
  if (!Array.isArray(d.members)) return null;
  const members = d.members.flatMap((raw): MemberRow[] => {
    const m = raw as Record<string, unknown>;
    if (typeof m?.id !== "string" || typeof m.name !== "string") return [];
    const pct = Number(m.progressPercent);
    if (!Number.isFinite(pct)) return [];
    return [
      {
        id: m.id,
        name: m.name,
        progressPercent: Math.max(0, Math.min(100, Math.round(pct))),
        lastActiveAt: typeof m.lastActiveAt === "string" ? m.lastActiveAt : null,
      },
    ];
  });
  return {
    group: {
      id: typeof g.id === "string" ? g.id : undefined,
      name: g.name,
      schwerpunkt: g.schwerpunkt,
      examDate: typeof g.examDate === "string" ? g.examDate : null,
      startsOn: typeof g.startsOn === "string" ? g.startsOn : null,
      archivedAt: typeof g.archivedAt === "string" ? g.archivedAt : null,
    },
    members,
  };
}
