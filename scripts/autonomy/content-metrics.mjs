/**
 * Content-Kennzahlen für den Planer (SIN-226, AP-26).
 * Reine Funktionen (Abdeckung, Regeln, Bericht) plus dünne Leser für Maps, Lauf-Berichte und Supabase.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fetchJson } from "./http.mjs";

export const MAPS_DIR = "docs/content";
export const RUNS_DIR = "docs/ops/content-runs";
/** Nur M0 ist schwerpunktneutral und wird einmal gezählt (AP-20, D-40). */
export const SHARED_MODULE_IDS = ["M0"];
export const PASS_RATE_MIN = 70;
export const COVERAGE_NEW_PROFESSION = 90;
export const LEARNERS_MIN = 50;
export const WEAKEST_UNITS = 5;
export const STUCK_RUNS = 2;
export const METALL_COURSE_ID = "e22073de-7020-4380-9002-c70d46c25e25";
/** Annahme: Kurse der anderen MAF-Schwerpunkte heißen so (Migration AP-20). */
export const COURSE_KEYWORDS = {
  "maf-kunststoff": "Maschinen- und Anlagenführer – Schwerpunkt Kunststoff",
  "maf-lebensmittel": "Maschinen- und Anlagenführer – Schwerpunkt Lebensmittel",
  "maf-packmittel": "Maschinen- und Anlagenführer – Schwerpunkt Packmittel",
  "maf-textil": "Maschinen- und Anlagenführer – Schwerpunkt Textil",
  "maf-textilveredelung": "Maschinen- und Anlagenführer – Schwerpunkt Textilveredelung",
  "maf-druckverarbeitung": "Maschinen- und Anlagenführer – Schwerpunkt Druckverarbeitung",
  indkfl: "Industriekaufmann",
};

/** Alle `docs/content/*.json` außer `*-curriculum*` und `sources.lock.json`. */
export function loadMaps(dir = MAPS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.includes("-curriculum") && f !== "sources.lock.json")
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")))
    .filter((m) => Array.isArray(m.modules));
}

/** Einheiten-IDs eines Moduls: `<blockId>-u<n>`. */
export const slotIds = (module) =>
  module.blocks.flatMap((b) => Array.from({ length: b.units }, (_, i) => `${b.id}-u${i + 1}`));

/**
 * Abdeckung je Map und Modul. Shared-Module zählen nur in der ersten Map, die sie hat (MAF Metall zuerst).
 * @param maps Curriculum-Maps
 * @param published Map-ID → Menge veröffentlichter Einheiten-IDs (Shared-Module: Einheiten mit shared_module_key)
 */
export function computeCoverage(maps, published, sharedIds = SHARED_MODULE_IDS) {
  const ordered = [...maps].sort((a, b) => (b.id === "maf-metall") - (a.id === "maf-metall") || a.id.localeCompare(b.id, "de"));
  const seen = new Set();
  return ordered.map((map) => {
    const have = published[map.id] ?? new Set();
    const modules = [];
    for (const m of map.modules) {
      const shared = map.family === "maf" && sharedIds.includes(m.id);
      if (shared && seen.has(m.id)) continue;
      if (shared) seen.add(m.id);
      const slots = slotIds(m);
      const done = slots.filter((s) => have.has(s)).length;
      modules.push({ id: m.id, title: m.title, shared, soll: slots.length, ist: done, pct: slots.length ? Math.round((done / slots.length) * 100) : 100 });
    }
    const soll = modules.reduce((s, m) => s + m.soll, 0);
    const ist = modules.reduce((s, m) => s + m.ist, 0);
    return { mapId: map.id, title: map.title, soll, ist, pct: soll ? Math.round((ist / soll) * 100) : 100, modules };
  });
}

export function renderCoverage(coverage) {
  const rows = ["| Beruf/Map | Modul | Soll | Ist | Abdeckung |", "| --- | --- | ---: | ---: | ---: |"];
  for (const c of coverage) {
    rows.push(`| **${c.mapId}** | alle | ${c.soll} | ${c.ist} | ${c.pct} % |`);
    for (const m of c.modules) rows.push(`| ${c.mapId} | ${m.id}${m.shared ? " (geteilt)" : ""} | ${m.soll} | ${m.ist} | ${m.pct} % |`);
  }
  return rows.join("\n");
}

/** Lauf-Berichte (AP-23) lesen; Dry-Runs zählen nicht. Neueste zuerst. */
export function loadRunReports(dir = RUNS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.endsWith("-dry-run.json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")))
    .filter((r) => r.mode !== "dry-run")
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

/** Kosten und Einheiten der Läufe; `weekSince` (ISO) für „diese Woche“. */
export function summarizeRuns(runs, weekSince) {
  const week = runs.filter((r) => String(r.startedAt) >= weekSince);
  const sum = (list, k) => list.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  // Die Fabrik hängt, wenn die letzten Läufe keine neue Einheit hervorgebracht haben.
  const last = runs.slice(0, STUCK_RUNS);
  return {
    laeufe: runs.length,
    laeufeWoche: week.length,
    einheitenNeuWoche: sum(week, "passed"),
    kostenWocheEur: Math.round(sum(week, "costEur") * 100) / 100,
    kostenLetzteLaeufe: runs.slice(0, 5).map((r) => ({ runId: r.runId, costEur: r.costEur, passed: r.passed })),
    fabrikHaengt: last.length >= STUCK_RUNS && last.every((r) => !(Number(r.passed) > 0)),
  };
}

/** Bestehensquote je Modul aus Bewertungen (Einheit → Modul über Einheiten-IDs der Map). */
export function passRateByModule(maps, evaluations, mapOfCourse) {
  const moduleOf = new Map(); // `${mapId}:${unitId}` → Modul-ID
  for (const map of maps) for (const m of map.modules) for (const s of slotIds(m)) moduleOf.set(`${map.id}:${s}`, m.id);
  const acc = new Map();
  for (const e of evaluations) {
    const mapId = mapOfCourse[e.course_id];
    const mod = moduleOf.get(`${mapId}:${e.unit_id}`);
    if (!mod) continue;
    const key = `${mapId}/${mod}`;
    const a = acc.get(key) ?? { mapId, moduleId: mod, total: 0, passed: 0, failed: 0 };
    a.total++;
    if (e.passed) a.passed++;
    else a.failed++;
    acc.set(key, a);
  }
  return [...acc.values()].map((a) => ({ ...a, pct: Math.round((a.passed / a.total) * 100) }));
}

/** Je Kurs: aktive Lernende (verschiedene Zufalls-Kennungen) und die schwächsten Einheiten (Anteil richtig). */
export function weakestUnits(progress, courseId, { limit = WEAKEST_UNITS, minAnswers = 5 } = {}) {
  const rows = progress.filter((p) => p.course_id === courseId);
  const learners = new Set(rows.map((p) => p.anonymous_id)).size;
  const per = new Map();
  for (const p of rows) {
    if (!p.unit_id || p.correct == null) continue;
    const a = per.get(p.unit_id) ?? { unitId: p.unit_id, n: 0, right: 0 };
    a.n++;
    if (p.correct) a.right++;
    per.set(p.unit_id, a);
  }
  const weakest = [...per.values()]
    .filter((a) => a.n >= minAnswers)
    .map((a) => ({ unitId: a.unitId, answers: a.n, pct: Math.round((a.right / a.n) * 100) }))
    .sort((a, b) => a.pct - b.pct || a.unitId.localeCompare(b.unitId))
    .slice(0, limit);
  return { learners, weakest };
}

/**
 * Planer-Regeln (SIN-226) als Hinweise für den Prompt. Gibt Issue-Vorschläge zurück; legt nichts an.
 * @param {{ coverage: any[], passRates?: any[], runs?: any, progress?: Record<string, any>, lastNewProfessionAt?: string | null, now?: Date }} f
 */
export function contentRuleHints({ coverage, passRates = [], runs, progress = {}, now = new Date(), lastNewProfessionAt = null, fabrikUeberfaelligTage = null }) {
  const hints = [];
  for (const p of passRates) {
    if (p.total > 0 && p.pct < PASS_RATE_MIN) {
      hints.push({ rule: "bestehensquote", title: `Prompt/Didaktik für Modul ${p.moduleId} (${p.mapId}) verbessern`, detail: `Bestehensquote ${p.pct} % (${p.passed}/${p.total}), Schwelle ${PASS_RATE_MIN} %.` });
    }
  }
  // SIN-378: Über 8 Tage ohne Lauf im Statusprotokoll ist ein Stillstand; gleiche Regel, kein neuer Meldeweg.
  if (Number(fabrikUeberfaelligTage) > 0 && !runs?.fabrikHaengt) {
    hints.push({ rule: "fabrik-haengt", title: "Content-Fabrik hängt: Ursache finden und beheben", detail: `Kein Lauf im Statusprotokoll, überfällig seit ${fabrikUeberfaelligTage} Tagen (erwartet: wöchentlich). Zeitplan content-grow.yml und letzten Lauf prüfen.` });
  }
  if (runs?.fabrikHaengt) {
    hints.push({ rule: "fabrik-haengt", title: "Content-Fabrik hängt: Ursache finden und beheben", detail: `Die letzten ${STUCK_RUNS} Läufe haben keine neue Einheit veröffentlicht. Nur dann legt der Planer Content-Issues für Lücken an.` });
  }
  const allCovered = coverage.length > 0 && coverage.every((c) => c.pct > COVERAGE_NEW_PROFESSION);
  if (allCovered) {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const recent = lastNewProfessionAt && new Date(lastNewProfessionAt) > monthAgo;
    if (!recent) {
      hints.push({ rule: "neuer-beruf", title: "Curriculum-Map für nächsten Beruf anlegen", detail: `Alle Maps sind zu über ${COVERAGE_NEW_PROFESSION} % abgedeckt. Amtliche Quelle nötig (AGENTS.md); höchstens 1 neuer Beruf pro Monat.` });
    }
  }
  for (const [mapId, p] of Object.entries(progress)) {
    if (p.learners >= LEARNERS_MIN && p.weakest.length) {
      hints.push({ rule: "lern-schleife", title: `Die ${p.weakest.length} schwächsten Einheiten in ${mapId} überarbeiten`, detail: `${p.learners} aktive Lernende. Schwächste Einheiten: ${p.weakest.map((w) => `${w.unitId} (${w.pct} % richtig, ${w.answers} Antworten)`).join(", ")}.` });
    }
  }
  return hints;
}

export function renderHints(hints) {
  return hints.length ? hints.map((h) => `- [${h.rule}] ${h.title}: ${h.detail}`).join("\n") : "(keine Regel ausgelöst)";
}

/** Wochenbericht: Abdeckungstabelle, neue Einheiten, Kosten. */
export function renderWeeklyReport({ coverage, runs }) {
  return [
    renderCoverage(coverage),
    "",
    `Einheiten neu diese Woche: ${runs.einheitenNeuWoche} (${runs.laeufeWoche} Läufe)`,
    `Kosten diese Woche: ${runs.kostenWocheEur.toFixed(2)} €`,
  ].join("\n");
}

export async function fetchAll(base, table, query, headers) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const page = await fetchJson("Supabase", `${base}/rest/v1/${table}?${query}`, { headers: { ...headers, Range: `${from}-${from + 999}` } });
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

/** SIN-394: Bewertungen auf aktuell vorhandene Fragen beschränken, je Frage höchstens eine; bewertet ≤ gesamt. */
export function ratedQuestions(questions, evaluations) {
  const key = (c, u, q) => `${c}:${u}:${q}`;
  const existing = new Set(questions.map((q) => key(q.course_id, q.unit_id, q.id)));
  const typeOf = new Map(questions.map((q) => [key(q.course_id, q.unit_id, q.id), q.type]));
  const seen = new Map();
  for (const e of evaluations) {
    const k = key(e.course_id, e.unit_id, e.question_id);
    if (existing.has(k)) seen.set(k, { ...e, type: typeOf.get(k) });
  }
  return { gesamt: existing.size, bewertet: [...seen.values()] };
}

/** SIN-395: Verwerfungsgründe aus den strukturierten Wertungen (Schwellen wie scoresPass), kein Freitext. */
export function discardReasons(e) {
  const r = [];
  if (Number(e.quellentreue) < 1) r.push("Quellentreue");
  if (Number(e.eindeutigkeit) < 1) r.push("Eindeutigkeit");
  if (Number(e.niveau) < 4) r.push("Niveau");
  if (Number(e.sprache) < 4) r.push("Sprache");
  return r.length ? r : ["sonstiger Grund"];
}

/** Verworfene Fragen (letzte Bewertung nicht bestanden) je Modul und Fragetyp mit gezählten Gründen, häufigste zuerst. */
export function discardedByModuleAndType(maps, evaluations, mapOfCourse) {
  const moduleOf = new Map();
  for (const map of maps) for (const m of map.modules) for (const s of slotIds(m)) moduleOf.set(`${map.id}:${s}`, m.id);
  const acc = new Map();
  for (const e of evaluations) {
    if (e.passed) continue;
    const mapId = mapOfCourse[e.course_id] ?? "unbekannt";
    const moduleId = moduleOf.get(`${mapId}:${e.unit_id}`) ?? "unbekannt";
    const type = e.type ?? "unbekannt";
    const k = `${mapId}/${moduleId}/${type}`;
    const a = acc.get(k) ?? { mapId, moduleId, type, count: 0, reasons: {} };
    a.count++;
    for (const r of discardReasons(e)) a.reasons[r] = (a.reasons[r] ?? 0) + 1;
    acc.set(k, a);
  }
  const name = (a) => `${a.mapId}/${a.moduleId}/${a.type}`;
  return [...acc.values()].sort((a, b) => b.count - a.count || name(a).localeCompare(name(b)));
}

export function renderDiscarded(rows, limit = 10) {
  if (!rows?.length) return "(keine verworfenen Fragen)";
  const lines = rows.slice(0, limit).map((r) => {
    const why = Object.entries(r.reasons)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, n]) => `${k} ${n}`)
      .join(", ");
    return `- ${r.mapId}/${r.moduleId} · ${r.type}: ${r.count} (${why})`;
  });
  if (rows.length > limit) lines.push(`- … und ${rows.length - limit} weitere Gruppen`);
  return lines.join("\n");
}

/** Liest Supabase und baut alle Content-Kennzahlen. Ohne Zugang: `{ verfuegbar: false }` (Abdeckung dann 0 %). */
export async function collectContentMetrics(env = process.env, { maps = loadMaps(), runs = loadRunReports(), now = new Date() } = {}) {
  const weekSince = new Date(now.getTime() - 7 * 864e5).toISOString();
  const runSummary = summarizeRuns(runs, weekSince);
  if (!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) {
    const coverage = computeCoverage(maps, {});
    return { verfuegbar: false, coverage, passRates: [], runs: runSummary, progress: {}, offeneVerworfene: "nicht verfügbar" };
  }
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  try {
    const courses = await fetchAll(env.SUPABASE_URL, "courses", "select=id,keyword&mock=eq.false", h);
    const mapOfCourse = {};
    const courseOfMap = {};
    for (const map of maps) {
      const c = map.id === "maf-metall" ? courses.find((x) => x.id === METALL_COURSE_ID) : courses.find((x) => x.keyword === COURSE_KEYWORDS[map.id]);
      if (c) {
        mapOfCourse[c.id] = map.id;
        courseOfMap[map.id] = c.id;
      }
    }
    const units = await fetchAll(env.SUPABASE_URL, "units", "select=id,course_id,shared_module_key", h);
    const published = {};
    for (const u of units) {
      const mapId = mapOfCourse[u.course_id];
      if (mapId) (published[mapId] ??= new Set()).add(u.id);
    }
    // Geteilte Einheiten liegen im Quellkurs (Metall) und stehen dort schon in `published`.
    // SIN-394: Nur Bewertungen zählen, deren Fragen noch existieren (append-only evaluations können auf gelöschte Fragen verweisen).
    const questions = await fetchAll(env.SUPABASE_URL, "questions", "select=course_id,unit_id,id,type&order=course_id,unit_id,id", h);
    const evaluations = await fetchAll(env.SUPABASE_URL, "question_quality_latest", "select=course_id,unit_id,question_id,passed,quellentreue,eindeutigkeit,niveau,sprache&order=course_id,unit_id,question_id", h);
    const { gesamt: fragenGesamt, bewertet: evaluationsWithExisting } = ratedQuestions(questions, evaluations);
    const progressRows = await fetchAll(env.SUPABASE_URL, "learning_progress", "select=anonymous_id,course_id,unit_id,correct", h);
    const progress = {};
    for (const [mapId, courseId] of Object.entries(courseOfMap)) progress[mapId] = weakestUnits(progressRows, courseId);
    return {
      verfuegbar: true,
      coverage: computeCoverage(maps, published),
      passRates: passRateByModule(maps, evaluationsWithExisting, mapOfCourse),
      offeneVerworfene: evaluationsWithExisting.filter((e) => !e.passed).length,
      verworfenNachModulTyp: discardedByModuleAndType(maps, evaluationsWithExisting, mapOfCourse),
      fragenGesamt,
      fragenBewertet: evaluationsWithExisting.length,
      runs: runSummary,
      progress,
    };
  } catch (e) {
    return { verfuegbar: false, fehler: e.message, coverage: computeCoverage(maps, {}), passRates: [], runs: runSummary, progress: {}, offeneVerworfene: `Fehler: ${e.message}` };
  }
}

/** Abschnitt „Content“ für den Planer-Prompt. */
export function renderContentSection(m, { sourceIssues = [], fabrik = {} } = {}) {
  const hints = contentRuleHints({ coverage: m.coverage, passRates: m.passRates, runs: m.runs, progress: m.progress, fabrikUeberfaelligTage: fabrik.ueberfaelligTage });
  const lowest = [...m.passRates].sort((a, b) => a.pct - b.pct).slice(0, 5);
  return [
    m.verfuegbar ? "Abdeckung und Bewertungen aus Supabase." : `Supabase nicht verfügbar${m.fehler ? ` (${m.fehler})` : ""}: Abdeckung zeigt 0 %, nicht als Lücke werten.`,
    "",
    renderWeeklyReport(m),
    "",
    `Bestehensquote je Modul (schwächste): ${lowest.length ? lowest.map((p) => `${p.mapId}/${p.moduleId} ${p.pct} % (${p.total})`).join(", ") : "nicht verfügbar"}`,
    `Fragen bewertet: ${m.fragenBewertet ?? "nicht verfügbar"} von ${m.fragenGesamt ?? "nicht verfügbar"} (Bewertungslauf: npm run quality:judge-backfill)`,
    `Verworfene Fragen (letzte Bewertung nicht bestanden): ${m.offeneVerworfene}`,
    "Verwerfungsgründe nach Modul und Fragetyp (häufigste zuerst):",
    m.verworfenNachModulTyp ? renderDiscarded(m.verworfenNachModulTyp) : "nicht verfügbar",
    `Kosten der letzten Läufe: ${m.runs.kostenLetzteLaeufe.length ? m.runs.kostenLetzteLaeufe.map((r) => `${r.runId} ${Number(r.costEur ?? 0).toFixed(2)} € (${r.passed ?? 0} bestanden)`).join("; ") : "keine Berichte"}`,
    `Quellen-Monitor: ${sourceIssues.length ? sourceIssues.map((i) => `${i.identifier} ${i.title}`).join("; ") : "keine offene Meldung"}`,
    `Content-Fabrik hängt: ${m.runs.fabrikHaengt ? "ja" : "nein"}`,
    `Content-Fabrik letzter Lauf (Statusprotokoll): ${fabrik.detail ?? "nicht verfügbar"}`,
    "",
    "Regeln aus den Kennzahlen (Vorschläge, nur diese Issues anlegen):",
    renderHints(hints),
  ].join("\n");
}
