/**
 * Versionen und Rücksetzen für Einheiten und Fragen (SIN-632).
 * Die Versionen schreibt der Trigger `content_version_schreiben` (Migration 20261023010000). Hier: Plan und Ausführung
 * des Rücksetzens als reine Funktionen plus schmaler Client-Typ, damit Tests ohne Supabase laufen.
 * Rücksetzen heißt: jede betroffene Version in umgekehrter Reihenfolge umkehren. Das schreibt selbst neue Versionen,
 * ist also wieder umkehrbar. Es wird nur der Stand der Zeile zurückgesetzt, nie mehr gelöscht als im Lauf angelegt wurde.
 */

export type Row = Record<string, unknown>;

export interface ContentVersion {
  id: number;
  tabelle: "units" | "questions";
  aktion: "insert" | "update" | "delete";
  course_id: string;
  unit_id: string;
  question_id: string | null;
  alt: Row | null;
  neu: Row | null;
  grund: string;
  issue: string | null;
  run_id: string | null;
  created_at: string;
}

export type Schritt =
  | { op: "loeschen"; tabelle: ContentVersion["tabelle"]; schluessel: Row; version: number }
  | { op: "schreiben"; tabelle: ContentVersion["tabelle"]; zeile: Row; version: number };

const schluessel = (v: ContentVersion): Row =>
  v.tabelle === "units"
    ? { course_id: v.course_id, id: v.unit_id }
    : { course_id: v.course_id, unit_id: v.unit_id, id: v.question_id };

/** Kehrt die Versionen um, neueste zuerst (so bleiben Fremdschlüssel gültig: Fragen vor Einheiten gelöscht, Einheiten zuerst zurück). */
export function planRueckgang(versionen: ContentVersion[]): Schritt[] {
  return [...versionen]
    .sort((a, b) => b.id - a.id)
    .map((v): Schritt => {
      if (v.aktion === "insert") return { op: "loeschen", tabelle: v.tabelle, schluessel: schluessel(v), version: v.id };
      if (!v.alt) throw new Error(`Version ${v.id} (${v.aktion}) hat keinen alten Stand`);
      return { op: "schreiben", tabelle: v.tabelle, zeile: v.alt, version: v.id };
    });
}

const KONFLIKT = { units: "course_id,id", questions: "course_id,unit_id,id" } as const;

type Fehler = { message: string } | null;
type Eq = PromiseLike<{ error: Fehler }> & { eq(col: string, val: unknown): Eq };
type Geordnet = PromiseLike<{ data: ContentVersion[] | null; error: Fehler }> & {
  eq(col: string, val: unknown): Geordnet;
  gte(col: string, val: unknown): Geordnet;
  order(col: string, o: { ascending: boolean }): Geordnet;
};

/** Teilmenge von SupabaseClient. */
export interface VersionDb {
  from(table: string): {
    select(cols: string): Geordnet;
    upsert(rows: Row[] | Row, opts?: { onConflict: string }): PromiseLike<{ error: Fehler }>;
    delete(): Eq;
  };
}

/** Grund, Issue und Lauf für die nächsten Schreibvorgänge (gilt 10 Minuten, siehe Migration). */
export async function setzeKontext(db: VersionDb, k: { grund: string; issue?: string; runId?: string }, now = new Date()): Promise<void> {
  const { error } = await db.from("content_version_kontext").upsert({
    id: true,
    grund: k.grund,
    issue: k.issue ?? null,
    run_id: k.runId ?? null,
    gueltig_bis: new Date(now.getTime() + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error(`kontext: ${error.message}`);
}

export type Auswahl = { runId: string } | { courseId: string; unitId: string; abVersion: number };

/** Versionen eines Laufs, oder einer Einheit (samt Fragen) ab einer Versionsnummer. */
export async function ladeVersionen(db: VersionDb, a: Auswahl): Promise<ContentVersion[]> {
  let q = db.from("content_versions").select("*").order("id", { ascending: false });
  q = "runId" in a ? q.eq("run_id", a.runId) : q.eq("course_id", a.courseId).eq("unit_id", a.unitId).gte("id", a.abVersion);
  const { data, error } = await q;
  if (error) throw new Error(`Versionen nicht lesbar: ${error.message}`);
  return data ?? [];
}

export async function fuehreAus(db: VersionDb, schritte: Schritt[]): Promise<void> {
  for (const s of schritte) {
    if (s.op === "schreiben") {
      const { error } = await db.from(s.tabelle).upsert(s.zeile, { onConflict: KONFLIKT[s.tabelle] });
      if (error) throw new Error(`Version ${s.version}: ${error.message}`);
    } else {
      let q = db.from(s.tabelle).delete();
      for (const [col, val] of Object.entries(s.schluessel)) q = q.eq(col, val);
      const { error } = await q;
      if (error) throw new Error(`Version ${s.version}: ${error.message}`);
    }
  }
}
