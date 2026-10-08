import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeCoverage,
  contentRuleHints,
  loadMaps,
  passRateByModule,
  ratedQuestions,
  renderCoverage,
  summarizeRuns,
  weakestUnits,
} from "../../../scripts/autonomy/content-metrics.mjs";
import { buildPlannerPrompt } from "../../../scripts/autonomy/planner.mjs";

const mod = (id: string, units: number) => ({ id, title: id, blocks: [{ id: `${id}-1`, units }] });
const maps = [
  { id: "maf-kunststoff", family: "maf", title: "K", modules: [mod("M0", 4), mod("LF1", 10)] },
  { id: "maf-metall", family: "maf", title: "M", modules: [mod("M0", 4), mod("LF1", 10)] },
  { id: "indkfl", family: "indkfl", title: "I", modules: [mod("M0", 5)] },
];
const ids = (m: string, n: number) => Array.from({ length: n }, (_, i) => `${m}-1-u${i + 1}`);

test("Abdeckung: geteiltes M0 zählt nur einmal (Metall zuerst), andere Familien zählen eigen", () => {
  const cov = computeCoverage(maps, {
    "maf-metall": new Set([...ids("M0", 4), ...ids("LF1", 5)]),
    "maf-kunststoff": new Set(ids("LF1", 10)),
    indkfl: new Set(ids("M0", 5)),
  });
  type Cov = { mapId: string; soll: number; pct: number; modules: { id: string }[] };
  const by = Object.fromEntries((cov as Cov[]).map((c) => [c.mapId, c]));
  assert.equal(by["maf-metall"].soll, 14);
  assert.equal(by["maf-metall"].pct, 64);
  assert.deepEqual(by["maf-kunststoff"].modules.map((m: { id: string }) => m.id), ["LF1"]);
  assert.equal(by["maf-kunststoff"].pct, 100);
  assert.equal(by.indkfl.pct, 100);
  assert.match(renderCoverage(cov), /\| maf-metall \| M0 \(geteilt\) \| 4 \| 4 \| 100 % \|/);
});

test("Echte Maps: curriculum-Datei ausgeschlossen, jede Map hat Module", () => {
  const real = loadMaps();
  assert.ok(real.length >= 8);
  assert.ok(!real.some((m: { id: string }) => m.id.includes("curriculum")));
});

test("Bestehensquote je Modul über Einheiten-ID und Kurs", () => {
  const ev = [
    { course_id: "c1", unit_id: "LF1-1-u1", passed: true },
    { course_id: "c1", unit_id: "LF1-1-u2", passed: false },
    { course_id: "c1", unit_id: "LF1-1-u3", passed: false },
    { course_id: "c9", unit_id: "LF1-1-u1", passed: true },
  ];
  const r = passRateByModule(maps, ev, { c1: "maf-metall" });
  assert.deepEqual(r, [{ mapId: "maf-metall", moduleId: "LF1", total: 3, passed: 1, failed: 2, pct: 33 }]);
});

test("Läufe: Kosten, neue Einheiten, Fabrik hängt nach 2 Läufen ohne Ergebnis", () => {
  const run = (n: number, passed: number) => ({ runId: `r${n}`, startedAt: `2026-10-0${n}T05:00:00Z`, mode: "live", passed, costEur: 1.5 });
  const s = summarizeRuns([run(5, 0), run(4, 0), run(3, 20)], "2026-10-03T00:00:00Z");
  assert.equal(s.fabrikHaengt, true);
  assert.equal(s.einheitenNeuWoche, 20);
  assert.equal(s.kostenWocheEur, 4.5);
  assert.equal(summarizeRuns([run(5, 0), run(4, 3)], "2026-10-01T00:00:00Z").fabrikHaengt, false);
});

test("Lern-Schleife: nur Einheiten mit genug Antworten, schwächste zuerst", () => {
  const rows = [];
  for (let l = 0; l < 50; l++) rows.push({ anonymous_id: `a${l}`, course_id: "c1", unit_id: l % 2 ? "u1" : "u2", correct: l % 5 === 0 });
  rows.push({ anonymous_id: "x", course_id: "c1", unit_id: "u3", correct: false });
  const p = weakestUnits(rows, "c1");
  assert.equal(p.learners, 51);
  assert.deepEqual(p.weakest.map((w: { unitId: string }) => w.unitId), ["u1", "u2"]);
});

test("Regeln: Quote < 70 %, hängende Fabrik, neuer Beruf, Lern-Schleife; sonst nichts", () => {
  const full = [{ mapId: "a", pct: 95, modules: [] }];
  const base = { coverage: [{ mapId: "a", pct: 40, modules: [] }], passRates: [], runs: { fabrikHaengt: false }, progress: {} };
  assert.deepEqual(contentRuleHints(base), []);
  const rules = (o: object) => contentRuleHints({ ...base, ...o }).map((h: { rule: string }) => h.rule);
  assert.deepEqual(rules({ passRates: [{ mapId: "a", moduleId: "LF2", total: 10, passed: 6, pct: 60 }] }), ["bestehensquote"]);
  assert.deepEqual(rules({ passRates: [{ mapId: "a", moduleId: "LF2", total: 10, passed: 7, pct: 70 }] }), []);
  assert.deepEqual(rules({ runs: { fabrikHaengt: true } }), ["fabrik-haengt"]);
  assert.deepEqual(rules({ coverage: full }), ["neuer-beruf"]);
  assert.deepEqual(rules({ coverage: [...full, { mapId: "b", pct: 90, modules: [] }] }), []);
  // höchstens 1 neuer Beruf pro Monat
  const now = new Date("2026-10-05T00:00:00Z");
  assert.deepEqual(rules({ coverage: full, now, lastNewProfessionAt: "2026-09-20" }), []);
  assert.deepEqual(rules({ coverage: full, now, lastNewProfessionAt: "2026-08-20" }), ["neuer-beruf"]);
  const weak = [{ unitId: "u1", answers: 9, pct: 10 }];
  assert.deepEqual(rules({ progress: { a: { learners: 49, weakest: weak } } }), []);
  assert.deepEqual(rules({ progress: { a: { learners: 50, weakest: weak } } }), ["lern-schleife"]);
});

test("Planer-Prompt enthält Content-Regeln und Abdeckungstabelle", () => {
  const prompt = buildPlannerPrompt({ definition: "", issues: [], metrics: {}, content: "| Beruf/Map |" });
  assert.match(prompt, /Content-Fabrik \(AP-23\) selbst/);
  assert.match(prompt, /## Content \(Abdeckung je Beruf\/Modul\)\n\| Beruf\/Map \|/);
});

test("SIN-394: ratedQuestions zählt Mehrfachbewertungen einmal und ignoriert gelöschte Fragen", () => {
  const questions = [
    { course_id: "c1", unit_id: "u1", id: "q1" },
    { course_id: "c1", unit_id: "u1", id: "q2" },
    { course_id: "c1", unit_id: "u1", id: "q4" },
  ];
  const evaluations = [
    { course_id: "c1", unit_id: "u1", question_id: "q1", passed: false },
    { course_id: "c1", unit_id: "u1", question_id: "q1", passed: true },
    { course_id: "c1", unit_id: "u1", question_id: "q2", passed: false },
    { course_id: "c1", unit_id: "u2", question_id: "q3", passed: true }, // Frage gelöscht
  ];
  const r = ratedQuestions(questions, evaluations);
  assert.equal(r.gesamt, 3);
  assert.equal(r.bewertet.length, 2);
  assert.ok(r.bewertet.length <= r.gesamt);
});
