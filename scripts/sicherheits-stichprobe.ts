/**
 * SIN-1541: Vorher/Nachher der Sicherheits-Merker-Lockerung (nur lesen) und Stichprobenliste.
 * Liest courses, units, questions und question_quality_latest; schreibt nur die Markdown-Datei.
 * Stichprobe: 10 % der nun sichtbaren Flag-Fragen des Standardkurses (fester Zufallswert 1541).
 *
 *   infisical run … -- node --import tsx scripts/sicherheits-stichprobe.ts [--out docs/ops/sicherheits-stichprobe-<Datum>.md]
 */
import { writeFileSync } from "node:fs";
import { fetchAll } from "./autonomy/content-metrics.mjs";
import { discardedQuestionKeys } from "../src/lib/learner/discarded";
import { merkerBlendetAus } from "../src/lib/learner/sicherheits-merker";
import { deriveModuleBlock } from "../src/lib/learner/modul-block";
import { frageSchluessel, type QuestionEvaluationRecord } from "../src/lib/quality/question-evaluations";

type Q = { course_id: string; unit_id: string; id: string; type: string; prompt: string; choices: string[] | null; correct: unknown; explanation: string; source_url: string };
type E = { course_id: string; unit_id: string; question_id: string; passed: boolean; sicherheit_flag: boolean; created_at: string };

const STANDARD_KURS = "e22073de-7020-4380-9002-c70d46c25e25";
const SEED = 1541;

/** mulberry32: kleiner fester Zufallsgenerator, damit die Stichprobe wiederholbar ist. */
function zufall(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const text = (v: unknown) => (Array.isArray(v) ? v.join(" → ") : String(v ?? "")).replace(/\s+/g, " ").replace(/\|/g, "\|");

/** Auswahlfragen speichern die Lösung als Position in `choices`; für die Liste als Antworttext ausgeben. */
const loesung = (q: Q) => (q.choices && /^\d+$/.test(String(q.correct)) ? (q.choices[Number(q.correct)] ?? String(q.correct)) : q.correct);

async function main() {
  const env = process.env;
  if (!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen (infisical run …)");
  const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const courses = (await fetchAll(env.SUPABASE_URL, "courses", "select=id,keyword,status&mock=eq.false&status=eq.published&order=keyword", h)) as Array<{ id: string; keyword: string }>;
  const questions = (await fetchAll(env.SUPABASE_URL, "questions", "select=course_id,unit_id,id,type,prompt,choices,correct,explanation,source_url&order=course_id,unit_id,id", h)) as Q[];
  const rows = (await fetchAll(env.SUPABASE_URL, "question_quality_latest", "select=course_id,unit_id,question_id,passed,sicherheit_flag,created_at&order=course_id,unit_id,question_id", h)) as E[];
  const datum = new Date().toISOString().slice(0, 10);
  const out: string[] = [`# Sicherheits-Stichprobe ${datum}`, "", "Nur gelesen (SIN-1541, Annahme Option 2 aus SIN-1517): nichts neu bewertet, nichts gelöscht, 0 € API-Kosten.", ""];
  let stichprobe: Q[] = [];

  for (const c of courses) {
    const qs = questions.filter((q) => q.course_id === c.id);
    const evals = rows.filter((e) => e.course_id === c.id).map((e) => ({ courseId: e.course_id, unitId: e.unit_id, questionId: e.question_id, passed: e.passed, sicherheitFlag: e.sicherheit_flag, createdAt: e.created_at }) as QuestionEvaluationRecord);
    const units = [...new Set(qs.map((q) => q.unit_id))].map((id) => ({ id }));
    const vorher = discardedQuestionKeys(evals, () => true);
    const nachher = discardedQuestionKeys(evals, merkerBlendetAus(units));
    const modul = new Map<string, { eV: Set<string>; eN: Set<string>; fV: number; fN: number; fGesamt: number }>();
    for (const q of qs) {
      const m = deriveModuleBlock(q.unit_id)?.moduleId ?? "?";
      const z = modul.get(m) ?? { eV: new Set(), eN: new Set(), fV: 0, fN: 0, fGesamt: 0 };
      const k = frageSchluessel(q.unit_id, q.id);
      z.fGesamt += 1;
      if (!vorher.has(k)) {
        z.fV += 1;
        z.eV.add(q.unit_id);
      }
      if (!nachher.has(k)) {
        z.fN += 1;
        z.eN.add(q.unit_id);
      }
      modul.set(m, z);
    }
    const gesamt = [...modul.values()].reduce((s, z) => ({ eV: s.eV + z.eV.size, eN: s.eN + z.eN.size, fV: s.fV + z.fV, fN: s.fN + z.fN, fG: s.fG + z.fGesamt }), { eV: 0, eN: 0, fV: 0, fN: 0, fG: 0 });
    out.push(`## ${c.keyword}`, "", `Einheiten sichtbar ${gesamt.eV} → ${gesamt.eN}, Fragen sichtbar ${gesamt.fV} → ${gesamt.fN} von ${gesamt.fG}.`, "", "| Modul | Einheiten vorher | Einheiten nachher | Fragen vorher | Fragen nachher | Fragen gesamt |", "| --- | --- | --- | --- | --- | --- |");
    for (const [m, z] of modul) out.push(`| ${m} | ${z.eV.size} | ${z.eN.size} | ${z.fV} | ${z.fN} | ${z.fGesamt} |`);
    out.push("");
    if (c.id === STANDARD_KURS) {
      const flagSichtbar = new Set(evals.filter((e) => e.passed && e.sicherheitFlag).map((e) => frageSchluessel(e.unitId, e.questionId)));
      const kandidaten = qs.filter((q) => flagSichtbar.has(frageSchluessel(q.unit_id, q.id)) && !nachher.has(frageSchluessel(q.unit_id, q.id)));
      const r = zufall(SEED);
      const gemischt = kandidaten.map((q) => ({ q, r: r() })).sort((a, b) => a.r - b.r).map((x) => x.q);
      stichprobe = gemischt.slice(0, Math.round(kandidaten.length * 0.1)).sort((a, b) => (a.unit_id + a.id).localeCompare(b.unit_id + b.id));
      out.push(`Nun sichtbare Fragen mit Merker (${c.keyword}): ${kandidaten.length}. Stichprobe 10 %: ${stichprobe.length} (Zufallswert ${SEED}).`, "");
    }
  }
  out.push("## Stichprobe", "", "| ID | Frage | Antworten | Lösung | Erklärung | Quelle |", "| --- | --- | --- | --- | --- | --- |");
  for (const q of stichprobe) out.push(`| ${q.unit_id}/${q.id} | ${text(q.prompt)} | ${text(q.choices)} | ${text(loesung(q))} | ${text(q.explanation)} | ${text(q.source_url)} |`);
  const i = process.argv.indexOf("--out");
  const file = i >= 0 ? process.argv[i + 1]! : `docs/ops/sicherheits-stichprobe-${datum}.md`;
  writeFileSync(file, `${out.join("\n")}\n`);
  console.log(`${file}: Stichprobe ${stichprobe.length} Fragen (nur gelesen)`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
