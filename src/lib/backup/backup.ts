/**
 * Nächtliche Sicherung der Inhalte (SIN-293): Export als JSON, Wiederherstellung, Aufbewahrung.
 * Reine Funktionen plus ein schmaler Client-Typ, damit Tests ohne Supabase laufen.
 * Keine Personendaten: `learning_progress`, Gruppen und Demo-Anfragen stehen bewusst nicht in `BACKUP_TABLES`.
 */
import { gunzipSync, gzipSync } from "node:zlib";

export const BACKUP_VERSION = 1;
export const PAGE_SIZE = 1000;
export const KEEP_DAILY_DAYS = 14;

/** Reihenfolge = Reihenfolge der Wiederherstellung (Fremdschlüssel). `key` = Konfliktziel für upsert. */
export const BACKUP_TABLES = [
  { name: "courses", key: "id", order: ["id"] },
  { name: "shared_modules", key: "key", order: ["key"] },
  { name: "course_shared_modules", key: "course_id,module_key", order: ["course_id", "module_key"] },
  { name: "sources", key: "id", order: ["id"] },
  { name: "plans", key: "id", order: ["id"] },
  { name: "units", key: "course_id,id", order: ["course_id", "id"] },
  { name: "questions", key: "course_id,unit_id,id", order: ["course_id", "unit_id", "id"] },
  { name: "evaluations", key: "id", order: ["id"] },
  { name: "question_evaluations", key: "id", order: ["id"] },
] as const;

export type TableName = (typeof BACKUP_TABLES)[number]["name"];
export type Row = Record<string, unknown>;

export interface BackupFile {
  version: number;
  createdAt: string;
  tables: Record<TableName, Row[]>;
  counts: Record<TableName, number>;
}

type Result<T> = PromiseLike<{ data: T; error: { message: string } | null }>;
type Ranged = { order(col: string): Ranged; range(from: number, to: number): Result<Row[] | null> };

/** Was vom Supabase-Client gebraucht wird (Teilmenge von SupabaseClient). */
export interface DbClient {
  from(table: string): {
    select(cols: string): unknown;
    upsert(rows: Row[], opts: { onConflict: string }): PromiseLike<{ error: { message: string } | null }>;
  };
}

async function readAll(db: DbClient, table: string, order: readonly string[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = db.from(table).select("*") as Ranged;
    for (const col of order) q = q.order(col);
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Lesen von ${table} fehlgeschlagen: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** Liest alle Inhalte (nur lesend). Mock-Kurse und alles, was zu ihnen gehört, bleiben draußen. */
export async function exportBackup(db: DbClient, now = new Date()): Promise<BackupFile> {
  const tables = {} as Record<TableName, Row[]>;
  for (const t of BACKUP_TABLES) tables[t.name] = await readAll(db, t.name, t.order);
  const real = new Set(tables.courses.filter((c) => c.mock !== true).map((c) => c.id));
  tables.courses = tables.courses.filter((c) => real.has(c.id));
  for (const t of BACKUP_TABLES) {
    if (t.name === "courses" || t.name === "shared_modules") continue;
    tables[t.name] = tables[t.name].filter((r) => real.has(r.course_id));
  }
  const counts = Object.fromEntries(BACKUP_TABLES.map((t) => [t.name, tables[t.name].length])) as Record<TableName, number>;
  return { version: BACKUP_VERSION, createdAt: now.toISOString(), tables, counts };
}

export const serialize = (b: BackupFile): Buffer => gzipSync(Buffer.from(JSON.stringify(b)), { level: 9 });

/** Liest und prüft eine Sicherung: Version, alle Tabellen da, Zähler stimmen, Fremdschlüssel schließen sich. */
export function parseBackup(buf: Buffer): BackupFile {
  const b = JSON.parse(gunzipSync(buf).toString("utf8")) as BackupFile;
  if (b.version !== BACKUP_VERSION) throw new Error(`Unbekannte Sicherungsversion ${b.version}`);
  for (const t of BACKUP_TABLES) {
    const rows = b.tables?.[t.name];
    if (!Array.isArray(rows)) throw new Error(`Tabelle ${t.name} fehlt in der Sicherung`);
    if (b.counts?.[t.name] !== rows.length) throw new Error(`Zähler für ${t.name} stimmt nicht (${b.counts?.[t.name]} ≠ ${rows.length})`);
  }
  const courses = new Set(b.tables.courses.map((c) => c.id));
  const units = new Set(b.tables.units.map((u) => `${u.course_id}/${u.id}`));
  for (const t of ["sources", "plans", "units", "questions", "evaluations", "question_evaluations", "course_shared_modules"] as const) {
    if (b.tables[t].some((r) => !courses.has(r.course_id))) throw new Error(`${t}: Zeile ohne Kurs in der Sicherung`);
  }
  if (b.tables.questions.some((q) => !units.has(`${q.course_id}/${q.unit_id}`))) throw new Error("questions: Frage ohne Einheit in der Sicherung");
  return b;
}

/** Schreibt per upsert in Fremdschlüssel-Reihenfolge. Löscht nie; Zeilen mit gleichem Schlüssel werden überschrieben. */
export async function restoreBackup(db: DbClient, b: BackupFile, { chunk = 500 }: { chunk?: number } = {}): Promise<Record<TableName, number>> {
  const written = {} as Record<TableName, number>;
  for (const t of BACKUP_TABLES) {
    const rows = b.tables[t.name];
    for (let i = 0; i < rows.length; i += chunk) {
      const { error } = await db.from(t.name).upsert(rows.slice(i, i + chunk), { onConflict: t.key });
      if (error) throw new Error(`Schreiben von ${t.name} fehlgeschlagen: ${error.message}`);
    }
    written[t.name] = rows.length;
  }
  return written;
}

export const backupName = (day: string) => `${day}.json.gz`;
const DAY_RE = /^(\d{4}-\d{2}-\d{2})\.json\.gz$/;
const DAY_MS = 86_400_000;

/**
 * Aufbewahrung: die letzten 14 Tage alle, ältere nur montags (wöchentlich).
 * Gibt die Dateinamen zurück, die gelöscht werden dürfen. Fremde Namen und die jüngste Sicherung bleiben unberührt.
 */
export function selectPrune(names: string[], now = new Date()): string[] {
  const newest = names.filter((n) => DAY_RE.test(n)).sort().at(-1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return names.filter((n) => {
    const day = n.match(DAY_RE)?.[1];
    if (!day || n === newest) return false;
    const t = Date.parse(`${day}T00:00:00Z`);
    return (today - t) / DAY_MS >= KEEP_DAILY_DAYS && new Date(t).getUTCDay() !== 1;
  });
}
