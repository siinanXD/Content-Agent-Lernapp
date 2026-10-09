/**
 * Content-Fabrik-Status für Planer und Produktreife (SIN-289).
 * Die Fabrik schreibt je Lauf eine Zeile in `content_factory_runs`. Daraus wird abgeleitet:
 * - läuft wöchentlich: jüngster Lauf höchstens 8 Tage alt
 * - hängt: die letzten 2 Läufe brachten kein neues Modul, obwohl die Queue nicht leer war
 * - pausiert: der jüngste Lauf endete wegen Anthropic-Limit (SIN-450), kein Issue; der nächste Lauf startet normal
 * Ohne Supabase-Zugang oder ohne Tabelle: „nicht verfügbar“.
 */
import { fetchJson } from "./http.mjs";
import { describeTableError, isSchemaCache, queueSinanTask } from "./table-error.mjs";

const NA = "nicht verfügbar";
const DAY = 86_400_000;
export const MAX_AGE_DAYS = 8;
export const STUCK_AFTER_RUNS = 2;
/** SIN-450: Beginn von `stop_reason`, wenn die Anthropic-API wegen Limit gesperrt war (src/lib/anthropic/limit-error.ts). */
export const PAUSE_PREFIX = "pausiert: API-Limit";
const isPaused = (r) => typeof r.stop_reason === "string" && r.stop_reason.startsWith(PAUSE_PREFIX);

/**
 * @param {{ created_at: string, new_module: boolean, queue_open: boolean }[]} rows neueste zuerst
 * @returns {{ status: "läuft" | "hängt" | "steht" | "pausiert", detail: string, overdueDays?: number }}
 */
export function deriveFabrikStatus(rows, now = Date.now()) {
  if (!rows.length) return { status: "steht", detail: "noch kein Lauf im Statusprotokoll" };
  const ageDays = Math.floor((now - Date.parse(rows[0].created_at)) / DAY);
  const lastDate = new Date(rows[0].created_at).toISOString().slice(0, 10);
  // SIN-378: „überfällig seit N Tagen“ zählt ab dem Tag, an dem der Lauf spätestens fällig war.
  if (ageDays > MAX_AGE_DAYS) {
    const overdueDays = ageDays - MAX_AGE_DAYS;
    return { status: "steht", detail: `überfällig seit ${overdueDays} Tagen (letzter Lauf am ${lastDate}, erwartet: wöchentlich)`, overdueDays };
  }
  // SIN-450: Gesperrte API ist keine Störung der Fabrik. Der jüngste Lauf entscheidet; ein späterer Lauf hebt es auf.
  if (isPaused(rows[0])) return { status: "pausiert", detail: `${rows[0].stop_reason} (Lauf am ${lastDate})` };
  const last = rows.slice(0, STUCK_AFTER_RUNS);
  if (last.length === STUCK_AFTER_RUNS && last.every((r) => !r.new_module && r.queue_open && !isPaused(r))) {
    return { status: "hängt", detail: `${STUCK_AFTER_RUNS} Läufe ohne neues Modul` };
  }
  return { status: "läuft", detail: `letzter Lauf am ${lastDate} (vor ${ageDays} Tagen)` };
}

function apply(out, { status, detail, overdueDays }) {
  out.content_fabrik = detail;
  out.content_fabrik_status = status;
  if (overdueDays !== undefined) out.content_fabrik_ueberfaellig_tage = overdueDays;
}

/** Kennzahlen `content_fabrik` (Text), `content_fabrik_status` (Code) und `content_fabrik_ueberfaellig_tage` (SIN-378). */
export async function collectFabrikMetrics(env = process.env, http = {}) {
  const out = { content_fabrik: NA, content_fabrik_status: NA, content_fabrik_ueberfaellig_tage: NA };
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !env[k]);
  if (missing.length) {
    out.content_fabrik = `${NA} (Secret fehlt im Workflow: ${missing.join(", ")})`;
    return out;
  }
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const url = `${env.SUPABASE_URL}/rest/v1/content_factory_runs?select=created_at,new_module,queue_open,stop_reason&order=created_at.desc&limit=${STUCK_AFTER_RUNS}`;
  try {
    apply(out, deriveFabrikStatus(await fetchJson("Supabase", url, { headers }, http)));
  } catch (e) {
    if (isSchemaCache(e)) {
      const sleep = http.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
      await sleep(500);
      try {
        apply(out, deriveFabrikStatus(await fetchJson("Supabase", url, { headers }, http)));
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
