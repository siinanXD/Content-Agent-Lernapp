/**
 * Gruppe anlegen und Teilnehmende einladen (SIN-356). Reine Funktionen: Eingaben prüfen und
 * Antworten lesen. Teilnehmende tragen nur einen Anzeigenamen (Vorname + Initial), nie eine E-Mail.
 */

export const NAME_MAX = 60;
export const GROUP_NAME_MAX = 80;
export const SCHWERPUNKT_MAX = 200;
/** So viele Einladungen auf einmal; die Gruppe selbst fasst höchstens 100 (siehe Migration). */
export const INVITE_BATCH_MAX = 30;

export type GroupInput = {
  name: string;
  schwerpunkt: string;
  startsOn: string | null;
  examDate: string | null;
};

export type Invitation = { memberId: string; name: string; code: string };

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function optionalDate(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  return typeof raw === "string" && validDate(raw) ? raw : undefined;
}

export function checkGroupInput(raw: unknown): Checked<GroupInput> {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof d.name === "string" ? d.name.trim() : "";
  const schwerpunkt = typeof d.schwerpunkt === "string" ? d.schwerpunkt.trim() : "";
  if (!name) return { ok: false, error: "Bitte geben Sie der Gruppe einen Namen." };
  if (name.length > GROUP_NAME_MAX) {
    return { ok: false, error: `Der Name darf höchstens ${GROUP_NAME_MAX} Zeichen haben.` };
  }
  if (!schwerpunkt) return { ok: false, error: "Bitte nennen Sie den Schwerpunkt." };
  if (schwerpunkt.length > SCHWERPUNKT_MAX) {
    return { ok: false, error: `Der Schwerpunkt darf höchstens ${SCHWERPUNKT_MAX} Zeichen haben.` };
  }
  const startsOn = optionalDate(d.startsOn);
  const examDate = optionalDate(d.examDate);
  if (startsOn === undefined || examDate === undefined) {
    return { ok: false, error: "Bitte geben Sie Datumsangaben als Tag, Monat und Jahr an." };
  }
  if (startsOn && examDate && examDate <= startsOn) {
    return { ok: false, error: "Die Prüfung muss nach dem Kursbeginn liegen." };
  }
  return { ok: true, value: { name, schwerpunkt, startsOn, examDate } };
}

/** Ein Anzeigename je Zeile. Leere Zeilen entfallen, doppelte Namen werden nur einmal eingeladen. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const name = line.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function checkNames(names: unknown): Checked<string[]> {
  if (!Array.isArray(names) || names.some((n) => typeof n !== "string")) {
    return { ok: false, error: "Bitte tragen Sie mindestens einen Namen ein." };
  }
  const list = parseNames((names as string[]).join("\n"));
  if (list.length === 0) return { ok: false, error: "Bitte tragen Sie mindestens einen Namen ein." };
  if (list.length > INVITE_BATCH_MAX) {
    return { ok: false, error: `Bitte laden Sie höchstens ${INVITE_BATCH_MAX} Personen auf einmal ein.` };
  }
  const tooLong = list.find((n) => n.length > NAME_MAX);
  if (tooLong) return { ok: false, error: `„${tooLong.slice(0, 20)}…“ ist länger als ${NAME_MAX} Zeichen.` };
  if (list.some((n) => n.includes("@"))) {
    return {
      ok: false,
      error: "Bitte nur Vorname und Initial eintragen, keine E-Mail-Adressen (zum Beispiel „Aylin K.“).",
    };
  }
  return { ok: true, value: list };
}

/** Beitrittscode in Fünfergruppen, gut lesbar und diktierbar: „AB12C-34DEF“. */
export function formatCode(code: string): string {
  return code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

/** Text zum Weitergeben: eine Zeile je Person. Die App versendet nichts. */
export function invitationsText(invitations: Invitation[]): string {
  return invitations.map((i) => `${i.name}: ${formatCode(i.code)}`).join("\r\n");
}

export function parseInvitations(data: unknown): Invitation[] | null {
  const list = (data as { invitations?: unknown } | null)?.invitations;
  if (!Array.isArray(list)) return null;
  return list.flatMap((raw): Invitation[] => {
    const i = raw as Record<string, unknown>;
    if (typeof i?.memberId !== "string" || typeof i.name !== "string" || typeof i.code !== "string") return [];
    return [{ memberId: i.memberId, name: i.name, code: i.code }];
  });
}
