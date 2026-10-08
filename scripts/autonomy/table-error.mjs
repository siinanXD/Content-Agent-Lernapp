/**
 * Fehlerklassen für Supabase-Tabellenabfragen im Kennzahlen-Bericht (SIN-359).
 * Statt eines pauschalen „Tabelle fehlt“ nennt der Bericht die Ursache:
 * - fehlt: Tabelle existiert nicht (Postgres 42P01, 404 ohne PostgREST-Code) → Migration anwenden
 * - zugriff: 401/403, 42501, PGRST301/302 (Key, RLS, Rechte) → Key und Rechte prüfen
 * - schema-cache: PostgREST kennt die Tabelle nicht (PGRST205 „in the schema cache“): Migration angewendet, Cache nicht neu geladen
 * - unbekannt: alles andere
 */

/** @param {{ status?: number | null, body?: string }} e @returns {"fehlt" | "zugriff" | "schema-cache" | "unbekannt"} */
export function classifyTableError(e) {
  let code = "";
  let text = String(e?.body ?? "");
  try {
    const j = JSON.parse(text);
    code = String(j.code ?? "");
    text = `${j.message ?? ""} ${j.hint ?? ""}`;
  } catch {
    /* kein JSON */
  }
  const status = e?.status ?? null;
  if (code === "42P01") return "fehlt";
  if (status === 401 || status === 403 || code === "42501" || /^PGRST30[12]$/.test(code)) return "zugriff";
  if (/schema cache/i.test(text)) return "schema-cache";
  if (status === 404) return "fehlt";
  return "unbekannt";
}

const LABEL = { fehlt: "fehlt", zugriff: "Zugriff verweigert", "schema-cache": "Schema-Cache", unbekannt: "unbekannt" };

const TEXT = {
  fehlt: (t, mig) => `Tabelle ${t} fehlt in Supabase, Migration ${mig} anwenden`,
  zugriff: (t) => `Zugriff auf ${t} verweigert (Service-Role-Key, RLS oder Rechte prüfen)`,
  "schema-cache": (t, mig) => `${t} nicht im Schema-Cache von Supabase (Migration ${mig} prüfen, danach Schema neu laden)`,
  unbekannt: (t, _mig, e) => `unbekannter Fehler bei ${t}: ${e?.message ?? e}`,
};

/** Bericht-Text mit Fehlerklasse, z. B. „nicht messbar [Zugriff verweigert]: …“. */
export function describeTableError(table, migration, e) {
  const klass = classifyTableError(e);
  return `nicht messbar [${LABEL[klass]}]: ${TEXT[klass](table, migration, e)}`;
}

/** Sinan-Aufgabe, wenn nur er die Ursache beheben kann (Key, Rechte, Schema-Cache im Dashboard); sonst null. */
export function sinanTaskForTableError(table, migration, e) {
  const klass = classifyTableError(e);
  if (klass === "zugriff") {
    return {
      titel: `Supabase-Zugriff auf ${table} freigeben`,
      wo: "Supabase-Dashboard und GitHub-Secrets des Repos",
      link: "https://supabase.com/dashboard",
      minuten: 10,
      schritte: [
        "In Supabase unter Project Settings → API den service_role-Key kopieren (nicht ins Repo und in keinen Kommentar).",
        "In GitHub unter Settings → Secrets → Actions `SUPABASE_SERVICE_ROLE_KEY` mit diesem Key setzen; `SUPABASE_URL` muss zum selben Projekt gehören.",
        `Im SQL-Editor prüfen: \`select has_table_privilege('service_role', 'public.${table}', 'select');\` muss true liefern.`,
      ],
      pruefung: "Der nächste Planer-Lauf meldet bei den Kennzahlen nicht mehr „Zugriff verweigert“. Du schließt das Issue danach selbst.",
    };
  }
  if (klass === "schema-cache") {
    return {
      titel: `Supabase-Schema-Cache für ${table} neu laden`,
      wo: "Supabase-Dashboard (SQL-Editor)",
      link: "https://supabase.com/dashboard",
      minuten: 5,
      schritte: [
        `Im SQL-Editor prüfen: \`select to_regclass('public.${table}');\` (leer = Migration ${migration} fehlt, dann Aufgabe \`migrate\` in run-task.yml starten).`,
        "Ist die Tabelle vorhanden: `NOTIFY pgrst, 'reload schema';` ausführen.",
      ],
      pruefung: "Der nächste Planer-Lauf meldet bei den Kennzahlen nicht mehr „Schema-Cache“. Du schließt das Issue danach selbst.",
    };
  }
  return null;
}

/** Legt die Aufgabe (falls nötig) in `http.sinanTasks` ab; der Planer legt sie als Issue an. */
export function queueSinanTask(http, table, migration, e) {
  const task = sinanTaskForTableError(table, migration, e);
  if (task && Array.isArray(http?.sinanTasks)) http.sinanTasks.push(task);
}
