/**
 * Duplikat-Schutz und Lauf-Aufträge des Planers (SIN-292). Reine Funktionen.
 *
 * Der Planer baute Werkzeuge doppelt, die es schon gab, weil sie „nie gelaufen“ waren. Jetzt gilt:
 * - Ein Plan-Eintrag mit `check` (Produktreife-Punkt) und Stufe „gebaut, nicht gelaufen“ wird zum Lauf-Auftrag.
 * - Ein Eintrag, der einem offenen oder in den letzten 14 Tagen erledigten Issue gleicht, wird kein neues Issue,
 *   sondern ein Kommentar am alten.
 */
import { CHECKS, STUFE, checkMarker } from "./readiness.mjs";

export const DUPLICATE_DAYS = 14;
export const RUN_LABEL = "lauf";
export const RUN_CAP_EUR = 20;

const STOP = new Set(["der", "die", "das", "und", "oder", "mit", "von", "für", "fuer", "zu", "im", "in", "am", "an", "auf", "ein", "eine", "pro", "je", "ap"]);

/** Kleingeschrieben, Umlaute vereinheitlicht, ohne Füllwörter. */
export function titleTokens(title) {
  const t = String(title ?? "")
    .toLowerCase()
    .replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss")
    .replace(/^(lauf|bau):\s*/, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return new Set(t);
}

/** Ähnlichkeit zweier Titel (Jaccard über Wörter, 0 bis 1). */
export function titleSimilarity(a, b) {
  const x = titleTokens(a);
  const y = titleTokens(b);
  if (!x.size || !y.size) return 0;
  const common = [...x].filter((w) => y.has(w)).length;
  return common / (x.size + y.size - common);
}

export const TITLE_THRESHOLD = 0.6;

/** Erledigt in den letzten `days` Tagen (Feld `completedAt`) oder noch offen. */
export function isRecentOrOpen(issue, now = new Date(), days = DUPLICATE_DAYS) {
  if (!issue.completedAt) return !["canceled", "completed"].includes(issue.state?.type);
  return now.getTime() - new Date(issue.completedAt).getTime() <= days * 24 * 3600 * 1000;
}

/**
 * Das Issue, dem der Eintrag gleicht: gleicher Produktreife-Punkt (Marker im Text oder Kennung unter `built[id].issues`)
 * oder ähnlicher Titel. Läufe zum selben Punkt zählen als Treffer, solange das Lauf-Issue offen oder jung ist.
 * @returns {{ issue: any, grund: string } | null}
 */
export function findDuplicate(entry, issues, { built = {}, now = new Date() } = {}) {
  const pool = issues.filter((i) => isRecentOrOpen(i, now));
  // Ein Lauf-Auftrag ist gerade die Antwort auf „Werkzeug schon gebaut“, daher zählt dort nur der Marker.
  const known = new Set(entry.check && !entry.runOrder ? built[entry.check]?.issues ?? [] : []);
  for (const i of pool) {
    if (entry.check && String(i.description ?? "").includes(checkMarker(entry.check))) return { issue: i, grund: `gleicher Produktreife-Punkt ${entry.check}` };
    if (known.has(i.identifier)) return { issue: i, grund: `Werkzeug zu ${entry.check} (${i.identifier}) ist schon gebaut` };
  }
  let best = null;
  for (const i of pool) {
    const s = titleSimilarity(entry.title, i.title);
    if (s >= TITLE_THRESHOLD && (!best || s > best.s)) best = { issue: i, s };
  }
  return best ? { issue: best.issue, grund: `ähnlicher Titel (${Math.round(best.s * 100)} %)` } : null;
}

/** Teilt den Plan in neue Einträge und Treffer (Kommentar statt neues Issue). */
export function splitDuplicates(plan, issues, opts = {}) {
  const { readiness = [], built = {} } = opts;
  const fresh = [];
  const duplicates = [];
  for (const raw of plan) {
    if (!raw || typeof raw !== "object") {
      fresh.push(raw); // ungültige Einträge meldet validatePlan
      continue;
    }
    // Gebaut, nie gelaufen: erst zum Lauf-Auftrag machen, dann auf Duplikate prüfen.
    const row = rowFor(raw, readiness);
    const entry = isRunnable(row) && raw.title ? toRunOrder(raw, row, built) : raw;
    const hit = findDuplicate(entry, issues, opts);
    if (hit) duplicates.push({ entry, ...hit });
    else fresh.push(entry);
  }
  return { fresh, duplicates };
}

/** Kommentartext am bestehenden Issue. */
export function duplicateComment(entry, grund) {
  return [
    `Der Planer wollte dazu ein neues Issue anlegen („${entry.title}“), hat es wegen eines Treffers unterlassen (${grund}).`,
    "",
    ...(entry.description ? [String(entry.description).trim(), ""] : []),
    ...((entry.acceptance ?? []).length ? ["Kriterien aus dem Planvorschlag:", ...entry.acceptance.map((a) => `- ${a}`)] : []),
  ].join("\n").trim();
}

/**
 * Macht aus einem Bau-Eintrag zu einem „gebaut, nicht gelaufen“-Punkt einen Lauf-Auftrag
 * (Workflow mit echten Secrets starten, Ergebnis mit Beleg in docs/product-readiness.json eintragen).
 */
export function toRunOrder(entry, row, built = {}) {
  const b = built[row.id] ?? {};
  const label = CHECKS.find((c) => c.id === row.id)?.label ?? row.label;
  return {
    ...entry,
    title: /^Lauf:/i.test(entry.title) ? entry.title : `Lauf: ${label}`,
    description: [
      `Das Werkzeug ist gebaut${b.beleg ? ` (${b.beleg})` : ""}, aber nie mit echten Daten gelaufen. Kein Neubau: ausführen.`,
      ...(b.lauf ? [`Aufruf: ${b.lauf}`] : []),
      "Ergebnis mit Datum und Beleg in `docs/product-readiness.json` eintragen (`bestaetigt` bei erfüllt, sonst `gelaufen` mit Ergebnis).",
      `Läufe, die Geld kosten, bleiben unter ${RUN_CAP_EUR} € je Kurslauf. Fehlen Secrets: Blocker im PR nennen, nichts erfinden.`,
      "",
      checkMarker(row.id),
    ].join("\n"),
    acceptance: [
      "Lauf mit echten Daten ausgeführt, Ergebnis im Beleg verlinkt",
      "`docs/product-readiness.json` mit Datum und Beleg aktualisiert",
    ],
    check: row.id,
    runOrder: true,
  };
}

/** Stufe zu einer Prüfung, falls der Eintrag auf einen Punkt zeigt. */
export const rowFor = (entry, rows = []) => (entry?.check ? rows.find((r) => r.id === entry.check) : undefined);

export const isRunnable = (row) => row?.stufe === STUFE.GEBAUT;
