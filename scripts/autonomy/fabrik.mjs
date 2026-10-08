/**
 * Content-Fabrik-Status für Planer und Produktreife (SIN-289).
 * Die Fabrik schreibt je Lauf eine Zeile in `content_factory_runs`. Daraus wird abgeleitet:
 * - läuft wöchentlich: jüngster Lauf höchstens 8 Tage alt
 * - hängt: die letzten 2 Läufe brachten kein neues Modul, obwohl die Queue nicht leer war
 * Ohne Supabase-Zugang oder ohne Tabelle: „nicht verfügbar“.
 */
import { fetchJson } from "./http.mjs";
import { describeTableError, isSchemaCache, queueSinanTask } from "./table-error.mjs";

const NA = "nicht verfügbar";
const DAY = 86_400_000;
export const MAX_AGE_DAYS = 8;
export const STUCK_AFTER_RUNS = 2;

/**
 * @param {{ created_at: string, new_module: boolean, queue_open: boolean }[]} rows neueste zuerst
 * @returns {{ status: "läuft" | "hängt" | "steht", detail: string }}
 */
export function deriveFabrikStatus(rows, now = Date.now()) {
  if (!rows.length) return { status: "steht", detail: "noch kein Lauf im Statusprotokoll" };
  const ageDays = Math.floor((now - Date.parse(rows[0].created_at)) / DAY);
  if (ageDays > MAX_AGE_DAYS) return { status: "steht", detail: `letzter Lauf vor ${ageDays} Tagen (erwartet: wöchentlich)` };
  const last = rows.slice(0, STUCK_AFTER_RUNS);
  if (last.length === STUCK_AFTER_RUNS && last.every((r) => !r.new_module && r.queue_open)) {
    return { status: "hängt", detail: `${STUCK_AFTER_RUNS} Läufe ohne neues Modul` };
  }
  return { status: "läuft", detail: `letzter Lauf vor ${ageDays} Tagen` };
}

/** Kennzahlen `content_fabrik` (Text) und `content_fabrik_status` (Code). */
export async function collectFabrikMetrics(env = process.env, http = {}) {
  const out = { content_fabrik: NA, content_fabrik_status: NA };
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !env[k]);
  if (missing.length) {
    out.content_fabrik = `${NA} (Secret fehlt im Workflow: ${missing.join(", ")})`;
    return out;
  }
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const url = `${env.SUPABASE_URL}/rest/v1/content_factory_runs?select=created_at,new_module,queue_open&order=created_at.desc&limit=${STUCK_AFTER_RUNS}`;
  try {
    const { status, detail } = deriveFabrikStatus(await fetchJson("Supabase", url, { headers }, http));
    out.content_fabrik = detail;
    out.content_fabrik_status = status;
  } catch (e) {
    if (isSchemaCache(e)) {
      const sleep = http.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
      await sleep(500);
      try {
        const { status, detail } = deriveFabrikStatus(await fetchJson("Supabase", url, { headers }, http));
        out.content_fabrik = detail;
        out.content_fabrik_status = status;
      } catch (retryError) {
        out.content_fabrik = describeTableError("content_factory_runs", "20261007020000", retryError);
        queueSinanTask(http, "content_factory_runs", "20261007020000", retryError);
      }
    } else {
      out.content_fabrik = describeTableError("content_factory_runs", "20261007020000", e);
      queueSinanTask(http, "content_factory_runs", "20261007020000", e);
    }
  }
  return out;
}
