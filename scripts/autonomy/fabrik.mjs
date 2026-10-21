/**
 * Content-Fabrik-Status für Planer und Produktreife (SIN-289).
 * Die Fabrik schreibt je Lauf eine Zeile in `content_factory_runs`. Daraus wird abgeleitet:
 * - läuft wöchentlich: jüngster Lauf höchstens 8 Tage alt
 * - hängt: die letzten 2 Läufe brachten kein neues Modul, obwohl die Queue nicht leer war
 * - pausiert: der jüngste Lauf endete wegen Anthropic-Limit (SIN-450), kein Issue; der nächste Lauf startet normal
 * `content_fabrik_ueberfaellig_tage` ist eine Zahl, sobald ein Statusprotokoll gelesen wurde (SIN-515):
 * 0 wenn nicht überfällig oder pausiert, sonst die Tage über der Frist. Ohne Lauf oder ohne Zugang: „nicht verfügbar“.
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
  if (isPaused(rows[0])) return { status: "pausiert", detail: `${rows[0].stop_reason} (Lauf am ${lastDate})`, overdueDays: 0 };
  const last = rows.slice(0, STUCK_AFTER_RUNS);
  if (last.length === STUCK_AFTER_RUNS && last.every((r) => !r.new_module && r.queue_open && !isPaused(r))) {
    return { status: "hängt", detail: `${STUCK_AFTER_RUNS} Läufe ohne neues Modul`, overdueDays: 0 };
  }
  return { status: "läuft", detail: `letzter Lauf am ${lastDate} (vor ${ageDays} Tagen)`, overdueDays: 0 };
}

/**
 * SIN-901: Fabrik-Kosten heute (UTC) und in 7 Tagen, Einheiten je € (nur Läufe mit Kosten).
 * @param {{ created_at: string, cost_eur: number, units_generated: number }[]} rows Läufe der letzten 7 Tage
 */
export function kostenZeile(rows, now = Date.now()) {
  const eur = (rs) => rs.reduce((s, r) => s + Number(r.cost_eur || 0), 0);
  const heute = new Date(now).toISOString().slice(0, 10);
  const woche = rows.filter((r) => Date.parse(r.created_at) > now - 7 * DAY);
  const einheiten = woche.reduce((s, r) => s + Number(r.units_generated || 0), 0);
  const gesamt = eur(woche);
  const je = gesamt > 0 ? `${(einheiten / gesamt).toFixed(1)} Einheiten je €` : "keine Kosten";
  const leer = woche.filter((r) => Number(r.cost_eur) > 0 && !Number(r.units_generated)).length;
  return `heute ${eur(woche.filter((r) => r.created_at.slice(0, 10) === heute)).toFixed(2)} €, 7 Tage ${gesamt.toFixed(2)} € (${einheiten} Einheiten, ${je}); bezahlte Läufe ohne Einheiten: ${leer}`;
}

function apply(out, { status, detail, overdueDays }) {
  out.content_fabrik = detail;
  out.content_fabrik_status = status;
  // SIN-515: vorher nur bei überfälliger Fabrik gesetzt, sonst blieb „nicht verfügbar“ stehen.
  out.content_fabrik_ueberfaellig_tage = overdueDays ?? NA;
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

/** SIN-901: Kennzahl `content_fabrik_kosten` aus `content_factory_runs`. Best effort: ohne Zugang oder bei Fehler „nicht verfügbar“. */
export async function collectFabrikKosten(env = process.env, http = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { content_fabrik_kosten: NA };
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const seit = new Date(Date.now() - 7 * DAY).toISOString();
  try {
    const rows = await fetchJson("Supabase", `${env.SUPABASE_URL}/rest/v1/content_factory_runs?select=created_at,cost_eur,units_generated&created_at=gte.${seit}&limit=1000`, { headers }, http);
    return { content_fabrik_kosten: Array.isArray(rows) ? kostenZeile(rows) : NA };
  } catch {
    return { content_fabrik_kosten: NA };
  }
}
