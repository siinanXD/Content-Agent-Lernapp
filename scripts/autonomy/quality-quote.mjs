#!/usr/bin/env node
/**
 * Bestehensquote des Richters, lesend (SIN-507). `npm run quality:quote [-- --out docs/quality/SIN-507-quote.md]`.
 * Quelle: `question_evaluations` (alle Zeilen, append-only) gegen `questions`. Keine API-Kosten, keine Schreibzugriffe.
 *
 * Messfehler, den die View `question_quality_latest` nicht abfängt: sie gruppiert nach dem Text von `question_id`.
 * Der Bewertungslauf schreibt `<unit_id>-<id>`, andere Wege schreiben `<id>`. Dieselbe Frage zählt dann doppelt
 * und `ratedQuestions` (SIN-409) nimmt die letzte Zeile in `question_id`-Reihenfolge, nicht die neueste.
 * Hier wird die ID zuerst vereinheitlicht und dann die neueste Bewertung je Frage gewählt.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { COURSE_KEYWORDS, METALL_COURSE_ID, fetchAll, loadMaps, slotIds } from "./content-metrics.mjs";

export const normKey = (courseId, unitId, questionId) => {
  const prefix = `${unitId}-`;
  const q = String(questionId);
  return `${courseId}:${unitId}:${q.startsWith(prefix) ? q.slice(prefix.length) : q}`;
};

/**
 * Ordnet Bewertungen den vorhandenen Fragen zu.
 * @returns gesamt (Fragen), mitFrage (Zeilen mit passender Frage), ohneFrage (Zeilen ohne), schluessel (verschiedene question_id-Texte),
 * doppelt (Fragen mit mehr als einer ID-Schreibweise), latest (neueste Bewertung je vorhandener Frage), ungeprueft (Fragen ohne Bewertung).
 */
export function matchEvaluations(questions, evaluations) {
  const byKey = new Map(questions.map((q) => [`${q.course_id}:${q.unit_id}:${q.id}`, q]));
  const latest = new Map();
  const forms = new Map();
  let mitFrage = 0;
  let ohneFrage = 0;
  for (const e of evaluations) {
    const k = normKey(e.course_id, e.unit_id, e.question_id);
    const q = byKey.get(k);
    if (!q) {
      ohneFrage++;
      continue;
    }
    mitFrage++;
    (forms.get(k) ?? forms.set(k, new Set()).get(k)).add(String(e.question_id));
    const prev = latest.get(k);
    if (!prev || String(e.created_at) >= String(prev.created_at)) latest.set(k, { ...e, type: q.type, key: k });
  }
  const distinctIds = new Set(evaluations.map((e) => `${e.course_id}:${e.unit_id}:${e.question_id}`)).size;
  return {
    gesamt: byKey.size,
    mitFrage,
    ohneFrage,
    schluessel: distinctIds,
    doppelt: [...forms.values()].filter((s) => s.size > 1).length,
    latest: [...latest.values()],
    ungeprueft: byKey.size - latest.size,
  };
}

/** Verwerfungsgründe wie `discardReasons` (Schwellen wie scoresPass), plus Sicherheits-Flag. */
export function criteria(e) {
  const r = [];
  if (Number(e.quellentreue) < 1) r.push("quellentreue");
  if (Number(e.eindeutigkeit) < 1) r.push("eindeutigkeit");
  if (Number(e.niveau) < 4) r.push("niveau");
  if (Number(e.sprache) < 4) r.push("sprache");
  return r;
}

/** Zählt bestanden/gesamt je Schlüssel aus `keyOf`. Sortiert nach Schlüssel. */
export function groupQuote(rows, keyOf) {
  const acc = new Map();
  for (const e of rows) {
    const k = keyOf(e) ?? "unbekannt";
    const a = acc.get(k) ?? { key: k, total: 0, passed: 0 };
    a.total++;
    if (e.passed) a.passed++;
    acc.set(k, a);
  }
  return [...acc.values()]
    .map((a) => ({ ...a, pct: a.total ? Math.round((a.passed / a.total) * 1000) / 10 : 0 }))
    .sort((a, b) => a.key.localeCompare(b.key, "de"));
}

/** Häufigste `reason` der Durchfaller (Text vor dem ersten Semikolon-Teil einzeln gezählt). */
export function topReasons(failed, limit = 10) {
  const acc = new Map();
  for (const e of failed) {
    for (const part of String(e.reason ?? "").split(";").map((s) => s.trim()).filter(Boolean)) {
      acc.set(part, (acc.get(part) ?? 0) + 1);
    }
  }
  return [...acc.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de")).slice(0, limit);
}

/** Kriterium je Durchfaller; ein Durchfaller kann mehrere reißen. */
export function failedCriteria(failed) {
  const acc = new Map();
  for (const e of failed) {
    const c = criteria(e);
    for (const k of c.length ? c : [e.sicherheit_flag ? "sicherheit_flag" : "ohne Kriterium (Schwelle erfüllt, passed=false)"]) acc.set(k, (acc.get(k) ?? 0) + 1);
  }
  return [...acc.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
}

export function computeQuote({ questions, evaluations, moduleOf = /** @type {(mapId: string, unitId: string) => string | undefined} */ (() => undefined), mapOfCourse = {} }) {
  const m = matchEvaluations(questions, evaluations);
  const passed = m.latest.filter((e) => e.passed).length;
  const failed = m.latest.filter((e) => !e.passed);
  const day = (e) => String(e.created_at ?? "").slice(0, 10) || "unbekannt";
  const mod = (e) => {
    const mapId = mapOfCourse[e.course_id] ?? "unbekannt";
    return `${mapId}/${moduleOf(mapId, e.unit_id) ?? "unbekannt"}`;
  };
  return {
    match: { gesamt: m.gesamt, mitFrage: m.mitFrage, ohneFrage: m.ohneFrage, schluessel: m.schluessel, doppelt: m.doppelt, ungeprueft: m.ungeprueft },
    bewertet: m.latest.length,
    bestanden: passed,
    pct: m.latest.length ? Math.round((passed / m.latest.length) * 1000) / 10 : null,
    nachModul: groupQuote(m.latest, mod),
    nachTyp: groupQuote(m.latest, (e) => e.type),
    nachPrompt: groupQuote(m.latest, (e) => e.prompt_version),
    nachRichter: groupQuote(m.latest, (e) => e.judge_model),
    nachTag: groupQuote(m.latest, day),
    kriterien: failedCriteria(failed),
    gruende: topReasons(failed),
  };
}

const row = (g) => `| ${g.key} | ${g.passed} | ${g.total} | ${g.pct} % |`;
const table = (title, groups) => [`### ${title}`, "", "| Wert | bestanden | bewertet | Quote |", "| --- | ---: | ---: | ---: |", ...groups.map(row), ""].join("\n");

export function renderQuote(q, { stand = new Date().toISOString().slice(0, 10) } = {}) {
  const m = q.match;
  return [
    `# Bestehensquote des Richters (Stand ${stand})`,
    "",
    `**Quote über vorhandene Fragen:** ${q.bestanden} von ${q.bewertet} bestanden (${q.pct ?? "n/a"} %), letzte Bewertung je Frage.`,
    "",
    "## Zuordnung",
    "",
    `- Fragen in \`questions\`: ${m.gesamt}; davon ohne Bewertung: ${m.ungeprueft}`,
    `- Bewertungszeilen mit passender Frage: ${m.mitFrage}; ohne passende Frage (gelöscht oder umgezogen): ${m.ohneFrage}`,
    `- Verschiedene \`question_id\`-Texte (so zählt die View \`question_quality_latest\`): ${m.schluessel}`,
    `- Fragen mit mehr als einer ID-Schreibweise (\`<id>\` und \`<unit_id>-<id>\`): ${m.doppelt}`,
    "",
    table("Nach Modul", q.nachModul),
    table("Nach Fragetyp", q.nachTyp),
    table("Nach prompt_version", q.nachPrompt),
    table("Nach judge_model", q.nachRichter),
    table("Nach Datum der letzten Bewertung", q.nachTag),
    "## Durchfaller nach Kriterium",
    "",
    "| Kriterium | Durchfaller |",
    "| --- | ---: |",
    ...q.kriterien.map(([k, n]) => `| ${k} | ${n} |`),
    "",
    "## Häufigste Begründungen (Top 10)",
    "",
    ...q.gruende.map(([r, n]) => `1. ${n}× ${r}`),
    "",
  ].join("\n");
}

/** Liest Supabase (nur GET) und liefert Eingaben für `computeQuote`. */
export async function loadInputs(env = process.env, maps = loadMaps()) {
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const base = env.SUPABASE_URL;
  const courses = await fetchAll(base, "courses", "select=id,keyword&mock=eq.false", h);
  const mapOfCourse = {};
  for (const map of maps) {
    const c = map.id === "maf-metall" ? courses.find((x) => x.id === METALL_COURSE_ID) : courses.find((x) => x.keyword === COURSE_KEYWORDS[map.id]);
    if (c) mapOfCourse[c.id] = map.id;
  }
  const questions = await fetchAll(base, "questions", "select=course_id,unit_id,id,type&order=course_id,unit_id,id", h);
  const evaluations = await fetchAll(
    base,
    "question_evaluations",
    "select=course_id,unit_id,question_id,passed,quellentreue,eindeutigkeit,niveau,sprache,sicherheit_flag,reason,prompt_version,judge_model,created_at&order=created_at,id",
    h,
  );
  const table = new Map();
  for (const map of maps) for (const m of map.modules) for (const s of slotIds(m)) table.set(`${map.id}:${s}`, m.id);
  return { questions, evaluations, mapOfCourse, moduleOf: (mapId, unitId) => table.get(`${mapId}:${unitId}`) };
}

async function main() {
  const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
  if (!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.log("nicht verfügbar: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen (lesender Zugriff nötig).");
    return;
  }
  const md = renderQuote(computeQuote(await loadInputs()));
  if (out) writeFileSync(out, md);
  console.log(md);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
