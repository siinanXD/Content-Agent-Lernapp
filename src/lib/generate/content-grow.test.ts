import assert from "node:assert/strict";
import test from "node:test";
import type { Curriculum, CurriculumModule } from "@/lib/content/curriculum";
import { BUDGET_EUR } from "@/lib/quality/cost-guard";
import { QUALITY_THRESHOLDS } from "@/lib/quality/schemas";
import type { BatchChunkTarget } from "./batch-generate";
import { MIN_PASSED_QUESTIONS } from "./repair-questions";
import {
  affectedUnitIds,
  affordableUnits,
  buildQueue,
  changeKey,
  chooseRunMap,
  MAP_COURSES,
  SUPPORTED_MAP_IDS,
  SCHWERPUNKT_MAP_IDS,
  supportedMapIds,
  resolveCourseId,
  mapPlan,
  eurPerUnit,
  judgeReserveEur,
  measuredPerUnit,
  partGate,
  PART_MAX_UNITS,
  splitTargets,
  linearSummary,
  planEurPerUnit,
  REPAIR_BATCH_RESERVE_EUR,
  REPAIR_STOP_EUR,
  nichtVersucht,
  unitCostHistory,
  type RunReport,
  missingSecrets,
  COST_MARGIN,
  nextOpenItem,
  nextOpenItems,
  pendingSlots,
  pickSafetySample,
  RUN_CAP_EUR,
  RUN_STOP_EUR,
  runAllowed,
  WEEK_CAP_EUR,
  slotIds,
  trimTargets,
} from "./content-grow";

function mod(id: string, order: number, units: number[]): CurriculumModule {
  return {
    id,
    order,
    blocks: units.map((n, i) => ({ id: `${id}-${i + 1}`, units: n })),
  } as unknown as CurriculumModule;
}

function map(id: string, family: string, modules: CurriculumModule[]): Curriculum {
  return { id, family, modules } as unknown as Curriculum;
}

const metall = map("maf-metall", "maf", [mod("LF3", 3, [2, 3]), mod("M0", 0, [2]), mod("LF1", 1, [2])]);
const kunststoff = map("maf-kunststoff", "maf", [mod("M0", 0, [2]), mod("LF1", 1, [2])]);
const queue = buildQueue([kunststoff, metall], ["M0"]);

test("slotIds zählt Einheiten je Block", () => {
  assert.deepEqual(slotIds(mod("LF3", 3, [2, 1])), ["LF3-1-u1", "LF3-1-u2", "LF3-2-u1"]);
});

test("Queue: Metall zuerst, Shared-Modul vor Schwerpunkt, Shared nur einmal", () => {
  assert.deepEqual(
    queue.map((q) => `${q.mapId}:${q.module.id}`),
    ["maf-metall:M0", "maf-metall:LF1", "maf-metall:LF3", "maf-kunststoff:LF1"],
  );
  assert.equal(queue[0]!.shared, true);
  assert.equal(queue[3]!.supported, false);
});

test("nächstes Modul: erstes ohne veröffentlichte Einheiten, Lücken in begonnenen Modulen blockieren nicht", () => {
  const none = new Set<string>();
  assert.equal(nextOpenItem(queue, none, none)?.item.module.id, "M0");
  const published = new Set(["M0-1-u1"]); // M0 begonnen, eine Lücke bleibt der Reparatur
  assert.equal(nextOpenItem(queue, published, none)?.item.module.id, "LF1");
  const more = new Set([...published, "LF1-1-u1", "LF1-1-u2"]);
  assert.equal(nextOpenItem(queue, more, none)?.item.module.id, "LF3");
});

test("nächstes Modul: unterbrochenes Modul läuft zuerst weiter", () => {
  const none = new Set<string>();
  const published = new Set(["M0-1-u1", "M0-1-u2", "LF3-1-u1"]);
  assert.equal(nextOpenItem(queue, published, none, "LF3")?.item.module.id, "LF3");
  assert.deepEqual(pendingSlots(queue[2]!.module, published, none), ["LF3-1-u2", "LF3-2-u1", "LF3-2-u2", "LF3-2-u3"]);
});

test("nicht unterstützte Maps werden nie gewählt; leere Queue gibt null", () => {
  const done = new Set(["M0-1-u1", "M0-1-u2", "LF1-1-u1", "LF1-1-u2", "LF3-1-u1", "LF3-1-u2", "LF3-2-u1", "LF3-2-u2", "LF3-2-u3"]);
  assert.equal(nextOpenItem(queue, done, new Set()), null);
});

test("verworfene Einheiten werden nicht erneut versucht", () => {
  const m = mod("LF3", 3, [2]);
  assert.deepEqual(pendingSlots(m, new Set(), new Set(["LF3-1-u1"])), ["LF3-1-u2"]);
});

function target(blockId: string, offset: number, count: number): BatchChunkTarget {
  return {
    customId: `maf-${blockId}-u${offset}`,
    module: mod("X", 0, []),
    block: { id: blockId, units: 9 } as unknown as BatchChunkTarget["block"],
    unitOffset: offset,
    unitCount: count,
  };
}

test("trimTargets: nur offene Einheiten, höchstens maxUnits, Rest wird gemeldet", () => {
  const targets = [target("LF3-1", 0, 2), target("LF3-1", 2, 2), target("LF3-1", 4, 1)];
  const pending = new Set(["LF3-1-u3", "LF3-1-u4", "LF3-1-u5"]);
  const r = trimTargets(targets, pending, 2);
  assert.equal(r.targets.length, 1);
  assert.equal(r.units, 2);
  assert.equal(r.leftOver, 1);
});

test("SIN-406: mehrere Module je Lauf, solange der Deckel Einheiten hergibt", () => {
  const none = new Set<string>();
  const ids = (n: number) => nextOpenItems(queue, none, none, null, n).map((x) => x.item.module.id);
  assert.deepEqual(ids(1), ["M0"]);
  assert.deepEqual(ids(3), ["M0", "LF1"]);
  assert.deepEqual(ids(100), ["M0", "LF1", "LF3"]);
  assert.deepEqual(ids(0), ["M0"]);
});

test("SIN-406: Fortsetzung bleibt vorn, begonnene und nicht unterstützte Module fehlen", () => {
  const none = new Set<string>();
  const published = new Set(["M0-1-u1"]);
  const plan = nextOpenItems(queue, published, none, "LF3", 100);
  assert.deepEqual(plan.map((x) => x.item.module.id), ["LF3", "LF1"]);
  assert.ok(plan.every((x) => x.item.supported));
});

test("SIN-406: Kostendeckel und Qualitäts-Schwelle bleiben unverändert", () => {
  assert.equal(RUN_CAP_EUR, 20);
  assert.equal(RUN_STOP_EUR, 19);
  assert.equal(BUDGET_EUR, 20);
  assert.equal(MIN_PASSED_QUESTIONS, 5);
  assert.deepEqual(QUALITY_THRESHOLDS, { sourceFidelity: 1, uniqueness: 1, niveauMin: 4, languageMin: 4 });
  // Auch mit vielen Modulen bleibt die Vorab-Rechnung unter dem Stopp-Wert.
  for (const spent of [0, 1.62, 10]) {
    const n = affordableUnits(spent, 0.04);
    assert.ok(spent + n * 0.04 * COST_MARGIN <= RUN_STOP_EUR);
  }
});

test("Deckel: Einheiten passen nur unter den Stopp-Wert", () => {
  assert.equal(affordableUnits(RUN_STOP_EUR, 0.07), 0);
  assert.equal(affordableUnits(25, 0.07), 0);
  const n = affordableUnits(9, 0.1);
  assert.ok(n >= 79 && n <= 80);
  assert.ok(9 + n * 0.1 * 1.25 <= RUN_STOP_EUR);
});

test("Kosten je Einheit aus echten Läufen, sonst Rückfallwert", () => {
  assert.equal(eurPerUnit([{ costEur: 3, unitsGenerated: 30 }, { costEur: 1, unitsGenerated: 10 }]), 0.1);
  assert.equal(eurPerUnit([]), 0.066);
  assert.equal(eurPerUnit([{ costEur: 0, unitsGenerated: 0 }]), 0.066);
});

test("Quellen-Monitor: nur Einheiten betroffener Blöcke, behandelte Änderungen lösen nichts aus", () => {
  const change = { url: "https://x", field: "stand", after: "2026-10" };
  const report = {
    diff: { changed: [change] },
    affected: [
      { mapId: "maf-metall", modules: [{ moduleId: "LF1", blockIds: ["LF1-2"] }] },
      { mapId: "maf-kunststoff", modules: [{ moduleId: "LF1", blockIds: ["LF1-1"] }] },
    ],
  };
  const stored = [
    { id: "LF1-1-u1", blockId: "LF1-1" },
    { id: "LF1-2-u1", blockId: "LF1-2" },
    { id: "LF1-2-u2", blockId: "LF1-2" },
  ];
  const r = affectedUnitIds(report, "maf-metall", stored, new Set());
  assert.deepEqual(r.unitIds, ["LF1-2-u1", "LF1-2-u2"]);
  assert.deepEqual(r.changeKeys, [changeKey(change)]);
  assert.deepEqual(affectedUnitIds(report, "maf-metall", stored, new Set([changeKey(change)])).unitIds, []);
  assert.deepEqual(affectedUnitIds(null, "maf-metall", stored, new Set()).unitIds, []);
});

test("Sicherheits-Stichprobe: 10 %, mindestens eine, deterministisch", () => {
  const units = Array.from({ length: 30 }, (_, i) => ({ id: `U-${String(i).padStart(2, "0")}`, safetyFlag: i % 2 === 0 }));
  const s = pickSafetySample(units);
  assert.equal(s.length, 2);
  assert.deepEqual(s, pickSafetySample(units));
  assert.deepEqual(pickSafetySample([{ id: "a", safetyFlag: false }]), []);
  assert.equal(pickSafetySample([{ id: "a", safetyFlag: true }]).length, 1);
});

test("fehlende Secrets werden benannt", () => {
  assert.ok(missingSecrets({}).includes("ANTHROPIC_WORKSPACE_ID"));
  const all = Object.fromEntries(missingSecrets({}).map((k) => [k, "x"]));
  assert.deepEqual(missingSecrets(all), []);
  assert.deepEqual(missingSecrets({ ...all, OPENAI_API_KEY: "  " }), ["OPENAI_API_KEY"]);
});

// SIN-431: Industriekaufleute in der Schlange, Läufe wechseln die Map ab.
const indkfl = map("indkfl", "indkfl", [mod("LF1", 1, [2]), mod("M0", 0, [1])]);
const beide = buildQueue([indkfl, metall, kunststoff], ["M0"]);
const keine = new Map<string, ReadonlySet<string>>();

test("indkfl ist unterstützt und hat einen eigenen Kurs", () => {
  assert.ok(SUPPORTED_MAP_IDS.includes("indkfl"));
  assert.notEqual(MAP_COURSES.indkfl!.courseId, MAP_COURSES["maf-metall"]!.courseId);
  assert.ok(SUPPORTED_MAP_IDS.every((id) => MAP_COURSES[id]));
});

test("Queue enthält indkfl-Module (Shared gilt nur für MAF), andere MAF-Schwerpunkte bleiben aus", () => {
  const ik = beide.filter((q) => q.mapId === "indkfl");
  assert.deepEqual(ik.map((q) => q.module.id), ["M0", "LF1"]);
  assert.ok(ik.every((q) => q.supported && !q.shared));
  assert.equal(beide.find((q) => q.mapId === "maf-kunststoff")!.supported, false);
});

// Jedes Metall-Modul hat eine veröffentlichte Einheit: keines ist unberührt, der Vorrang entfällt (SIN-469).
const metallBegonnen = new Map<string, ReadonlySet<string>>([
  ["maf-metall", new Set(beide.filter((q) => q.mapId === "maf-metall").map((q) => slotIds(q.module)[0]!))],
]);

test("Lauf wechselt die Map ab: nach Metall kommt indkfl, danach wieder Metall", () => {
  assert.equal(chooseRunMap(beide, metallBegonnen, keine, null), "maf-metall");
  assert.equal(chooseRunMap(beide, metallBegonnen, keine, "maf-metall"), "indkfl");
  assert.equal(chooseRunMap(beide, metallBegonnen, keine, "indkfl"), "maf-metall");
});

test("SIN-469: Metall mit Modulen ohne Einheiten (LF3 bis LF6) geht vor dem Wechsel zu indkfl", () => {
  assert.equal(chooseRunMap(beide, keine, keine, "maf-metall"), "maf-metall");
  assert.equal(chooseRunMap(beide, keine, keine, "indkfl"), "maf-metall");
});

test("SIN-469: Läufe pro Woche: einer je Tag, Wochendeckel 40 €", () => {
  const lauf = (startedAt: string, costEur: number, generated = 10) => ({ mode: "live" as const, startedAt, costEur, generated });
  const now = new Date("2026-10-14T05:47:00Z");
  assert.deepEqual(runAllowed([], now), { ok: true });
  assert.deepEqual(runAllowed([lauf("2026-10-12T05:50:00Z", 12)], now), { ok: true });
  assert.equal(runAllowed([lauf("2026-10-14T01:00:00Z", 5)], now).ok, false);
  // Probelauf und Lauf ohne Kosten und Ergebnis (API gesperrt) zählen nicht.
  assert.deepEqual(runAllowed([{ ...lauf("2026-10-14T01:00:00Z", 5), mode: "dry-run" as const }], now), { ok: true });
  assert.deepEqual(runAllowed([lauf("2026-10-14T01:00:00Z", 0, 0)], now), { ok: true });
  const voll = [lauf("2026-10-09T05:00:00Z", 10), lauf("2026-10-10T05:00:00Z", 10), lauf("2026-10-12T05:00:00Z", 10)];
  assert.equal(runAllowed(voll, now).ok, false);
  // Älter als 7 Tage fällt aus der Wochensumme.
  assert.deepEqual(runAllowed([lauf("2026-10-06T05:00:00Z", 10), ...voll.slice(1)], now), { ok: true });
  assert.equal(WEEK_CAP_EUR, 40);
});

test("SIN-661: Wochendeckel Grenzfälle und Teilbatch", () => {
  const lauf = (costEur: number) => ({ mode: "live" as const, startedAt: "2026-10-12T05:00:00Z", costEur, generated: 10 });
  const now = new Date("2026-10-14T05:47:00Z");
  // Wochenkosten + Lauf-Deckel genau 40 € startet noch, ein Cent mehr nicht (Grund im Text).
  assert.equal(runAllowed([lauf(WEEK_CAP_EUR - RUN_CAP_EUR)], now).ok, true);
  const zuViel = runAllowed([lauf(WEEK_CAP_EUR - RUN_CAP_EUR + 0.01)], now);
  assert.equal(zuViel.ok, false);
  assert.match(zuViel.ok ? "" : zuViel.reason, /Wochendeckel/);
  // Teilbatch: gegen den Rest der Woche gerechnet kürzt partGate den Lauf.
  assert.equal(partGate(4.5, 100, 0.059, 0, 5).ok, false);
  assert.equal(partGate(0, 10, 0.059, 0, 5).ok, true);
});

test("SIN-672: Ledger-Wochensumme (Richter-Läufe) zählt in Start und Teilbatch", () => {
  const now = new Date("2026-10-14T05:47:00Z");
  const kleinerBericht = [{ mode: "live" as const, startedAt: "2026-10-12T05:00:00Z", costEur: 5, generated: 10 }];
  // Fabrik-Berichte allein: 5 €, Ledger inkl. judge-backfill: 20,01 € -> kein Start.
  assert.equal(runAllowed(kleinerBericht, now).ok, true);
  assert.equal(runAllowed(kleinerBericht, now, WEEK_CAP_EUR - RUN_CAP_EUR + 0.01).ok, false);
  assert.equal(runAllowed(kleinerBericht, now, WEEK_CAP_EUR - RUN_CAP_EUR).ok, true);
  // Knapp unter dem Deckel: der Teilbatch, der 40 € überschreiten würde, startet nicht (Lauf-Deckel allein ließe ihn zu).
  const week = 36;
  assert.equal(partGate(0, 10, 0.059, 0, RUN_CAP_EUR).ok, true);
  const gate = partGate(0, 100, 0.059, 0, RUN_CAP_EUR, week);
  assert.equal(gate.ok, false);
  assert.ok(week + gate.expectedEur > WEEK_CAP_EUR);
  assert.equal(partGate(0, 10, 0.059, 0, RUN_CAP_EUR, week).ok, true);
});

test("Lauf: fertige Map wird übersprungen, nichts offen ergibt null, Fortsetzung zuerst", () => {
  const ids = (mapId: string) =>
    new Set(beide.filter((q) => q.mapId === mapId).flatMap((q) => slotIds(q.module)));
  const metallFertig = new Map([["maf-metall", ids("maf-metall")]]);
  assert.equal(chooseRunMap(beide, metallFertig, keine, "maf-metall"), "indkfl");
  const indkflFertig = new Map([["indkfl", ids("indkfl")]]);
  assert.equal(chooseRunMap(beide, indkflFertig, keine, "maf-metall"), "maf-metall");
  const fertig = new Map([["maf-metall", ids("maf-metall")], ["indkfl", ids("indkfl")]]);
  assert.equal(chooseRunMap(beide, fertig, keine, null), null);
  // Verworfene zählen nur in ihrer eigenen Map (gleiche IDs in beiden Maps).
  assert.equal(chooseRunMap(beide, keine, metallFertig, "indkfl"), "indkfl");
  // Ein angefangenes indkfl-Modul läuft zuerst weiter, auch wenn Metall dran wäre.
  assert.equal(chooseRunMap(beide, keine, keine, "indkfl", "LF1"), "indkfl");
});

test("Plan eines Laufs bleibt in der gewählten Map, Modulreihenfolge unverändert", () => {
  const nurIndkfl = beide.filter((q) => q.mapId === "indkfl");
  const plan = nextOpenItems(nurIndkfl, new Set(), new Set(), null, 100);
  assert.deepEqual(plan.map((x) => x.item.module.id), ["M0", "LF1"]);
});

test("SIN-434: Kosten je Einheit ohne Reparatur (Lauf 10-08: 0,04 statt 0,12 €)", () => {
  const h = unitCostHistory([
    { costEur: 2.43, generated: 20, repair: { costEur: 1.62 } },
    { costEur: 1, generated: 0, repair: { costEur: 1 } },
    { costEur: 0.5, generated: 10 },
  ]);
  assert.deepEqual(h.map((x) => Number(x.costEur.toFixed(2))), [0.81, 0.5]);
  assert.equal(Number(eurPerUnit(h).toFixed(3)), 0.044);
  assert.ok(affordableUnits(0, eurPerUnit(h)) > 300);
  // Mit Reparatur eingerechnet blieben es nur 125 Einheiten je Lauf.
  assert.equal(affordableUnits(0, 2.43 / 20), 125);
});

test("SIN-478: Lauf mit Reparaturstufe endet bei höchstens 20 € (Lauf 10-12 kostete 21,78 €)", () => {
  // Historie wie in docs/ops/content-runs: 10-08 = 0,041 €/Einheit, 10-12 = 0,059 €/Einheit (Reparatur 2,90 € abgezogen).
  const history = unitCostHistory([
    { costEur: 2.43, generated: 20, repair: { costEur: 1.62 } },
    { costEur: 21.78, generated: 318, repair: { costEur: 2.9 } },
  ]);
  const actualPerUnit = 18.88 / 318;
  const spent = 2.9;
  // Alte Planung mit dem Durchschnitt hätte 318 Einheiten geplant und den Deckel gerissen.
  assert.ok(spent + 318 * actualPerUnit > RUN_CAP_EUR);
  const perUnit = planEurPerUnit(history);
  assert.ok(perUnit >= actualPerUnit);
  const n = affordableUnits(spent, perUnit);
  assert.ok(n > 0);
  assert.ok(spent + n * actualPerUnit <= RUN_CAP_EUR);
  // Richter-Reserve wächst mit der Zahl der Einheiten (das Gate prüft sie vor dem Richter-Aufruf).
  assert.ok(judgeReserveEur(n) > 0);
  assert.equal(judgeReserveEur(0), 0);
});

test("SIN-478: Reparatur stoppt früh genug, dass ihr letzter Batch im Deckel bleibt", () => {
  assert.equal(REPAIR_STOP_EUR + REPAIR_BATCH_RESERVE_EUR, RUN_CAP_EUR);
  assert.ok(REPAIR_BATCH_RESERVE_EUR >= 2.9);
});

test("SIN-493: splitTargets teilt in Teile mit höchstens 100 Einheiten", () => {
  const targets = Array.from({ length: 250 }, (_, i) => target("B", i * 2, 2)); // 500 Einheiten
  const parts = splitTargets(targets);
  assert.equal(parts.length, 5);
  for (const p of parts) assert.ok(p.reduce((n, t) => n + t.unitCount, 0) <= PART_MAX_UNITS);
  assert.deepEqual(parts.flat(), targets);
  assert.deepEqual(splitTargets([]), []);
});

test("SIN-493: teurerer Teilbatch stoppt den Lauf unter 20 €", () => {
  // 5 Teile à 100 Einheiten, geplant mit 0,041 €/Einheit; tatsächlich 0,09 €/Einheit (9 € je Teil).
  const parts = splitTargets(Array.from({ length: 250 }, (_, i) => target("B", i * 2, 2)));
  let spent = 2.9; // Reparatur
  let perUnit = 0.041;
  let units = 0;
  let sent = 0;
  for (const part of parts) {
    const n = part.reduce((s, t) => s + t.unitCount, 0);
    if (!partGate(spent, n, perUnit, units).ok) break;
    const before = spent;
    spent += 9;
    units += n;
    sent++;
    perUnit = measuredPerUnit(perUnit, spent - before, n);
  }
  assert.equal(sent, 1); // nach Teil 1 ist die Messung 0,09 €/Einheit; Teil 2 würde 20 € reißen
  assert.ok(spent <= RUN_CAP_EUR);
});

test("SIN-563: Lauf mit zu hohen Kosten stoppt vor dem Überschreiten, inkl. Richter", () => {
  // 10 Teile à 100 Einheiten; Plan 0,05 €/Einheit, real bis +80 % darüber.
  const parts = splitTargets(Array.from({ length: 500 }, (_, i) => target("B", i * 2, 2)));
  for (const real of [0.05, 0.0625, 0.09]) {
    let spent = 2.9;
    let perUnit = 0.05;
    let units = 0;
    let sent = 0;
    for (const part of parts) {
      const n = part.reduce((s, t) => s + t.unitCount, 0);
      if (!partGate(spent, n, perUnit, units).ok) break;
      const before = spent;
      spent += n * real;
      units += n;
      sent++;
      perUnit = measuredPerUnit(perUnit, spent - before, n);
    }
    assert.ok(sent < parts.length, `real ${real}: Deckel muss greifen`);
    assert.ok(spent + judgeReserveEur(units) <= RUN_CAP_EUR, `real ${real}: ${spent} € + Richter über Deckel`);
  }
});

test("SIN-493: partGate und measuredPerUnit", () => {
  const gate = partGate(2.9, 100, 0.059, 0);
  assert.ok(gate.ok);
  assert.ok(gate.expectedEur > 2.9 + 100 * 0.059);
  assert.equal(measuredPerUnit(0.05, 3, 100), 0.05);
  assert.equal(measuredPerUnit(0.05, 9, 100), 0.09);
  assert.equal(measuredPerUnit(0.05, 0, 100), 0.05);
});

test("SIN-434: nicht versucht nach Grund", () => {
  const none = new Set<string>();
  const published = new Set(["LF3-1-u1"]);
  const planIds = new Set(["M0"]);
  // M0 im Plan; LF1 unberührt (2) + 1 abgeschnitten = Deckel; LF3 begonnen: 5 - 1 = 4 Lücken.
  assert.deepEqual(nichtVersucht(queue, published, none, planIds, 1, false, 7), [
    { grund: "kostendeckel", units: 3 },
    { grund: "begonnene-module", units: 4 },
    { grund: "andere-map", units: 7 },
  ]);
  assert.deepEqual(nichtVersucht(queue, published, none, planIds, 2, true), [
    { grund: "kostendeckel", units: 2 },
    { grund: "zeitlimit", units: 2 },
    { grund: "begonnene-module", units: 4 },
  ]);
  assert.deepEqual(nichtVersucht(queue, none, none, new Set(["M0", "LF1", "LF3"]), 0, false), []);
});

test("SIN-434: Lauf-Bericht nennt verworfen und nicht versucht mit Grund", () => {
  const r = {
    runId: "x", mode: "live", mapId: "maf-metall", moduleId: "ZP", nextModuleId: null, generated: 20, passed: 16,
    discarded: 4, discardedUnitIds: ["ZP-2-u1"], deferred: 0, repair: { ran: true, costEur: 1.62 },
    sourceRefresh: { units: 0, replaced: 0, changeKeys: [] }, costEur: 2.43, capEur: 20, model: "m", stopReason: null,
    nichtVersucht: [{ grund: "kostendeckel", units: 5 }, { grund: "zeitlimit", units: 2 }],
  } as unknown as RunReport;
  const text = linearSummary(r);
  assert.match(text, /Verworfen .*: 4 \(ZP-2-u1\)/);
  assert.match(text, /Nicht versucht: 5 wegen Kostendeckel; 2 wegen Zeitlimit/);
});

// SIN-479: die 6 weiteren MAF-Schwerpunkte
const textil = map("maf-textil", "maf", [mod("M0", 0, [2]), mod("LF1", 1, [3])]);
const alle = buildQueue([indkfl, metall, kunststoff, textil], ["M0"], [...SUPPORTED_MAP_IDS, ...SCHWERPUNKT_MAP_IDS]);
const slotsOf = (mapId: string) => new Set(alle.filter((q) => q.mapId === mapId).flatMap((q) => slotIds(q.module)));

test("SIN-479: alle 6 Schwerpunkte haben einen Kurs-Eintrag", () => {
  assert.equal(SCHWERPUNKT_MAP_IDS.length, 6);
  for (const id of SCHWERPUNKT_MAP_IDS) {
    assert.match(MAP_COURSES[id]!.courseKeyword!, /^Maschinen- und Anlagenführer – Schwerpunkt /);
    assert.ok(!SUPPORTED_MAP_IDS.includes(id));
  }
});

test("SIN-479: Schwerpunkte laufen nur mit Schalter; Kurs wird über das Stichwort gefunden", () => {
  assert.deepEqual(supportedMapIds({}), SUPPORTED_MAP_IDS);
  assert.deepEqual(supportedMapIds({ CONTENT_GROW_SCHWERPUNKTE: "1" }), [...SUPPORTED_MAP_IDS, ...SCHWERPUNKT_MAP_IDS]);
  const kurse = [
    { id: "k-mock", keyword: MAP_COURSES["maf-kunststoff"]!.courseKeyword!, mock: true },
    { id: "k-echt", keyword: MAP_COURSES["maf-kunststoff"]!.courseKeyword!, mock: false },
  ];
  assert.equal(resolveCourseId("maf-kunststoff", kurse), "k-echt");
  assert.equal(resolveCourseId("maf-textil", kurse), null);
  assert.equal(resolveCourseId("maf-metall", kurse), MAP_COURSES["maf-metall"]!.courseId);
});

test("SIN-479: gemeinsame Module werden nicht erneut erzeugt, nur in der Metall-Queue geplant", () => {
  for (const mapId of ["maf-kunststoff", "maf-textil"]) {
    assert.ok(alle.filter((q) => q.mapId === mapId).every((q) => q.module.id !== "M0" && !q.shared));
  }
  assert.ok(alle.some((q) => q.mapId === "maf-metall" && q.module.id === "M0" && q.shared));
  const plan = mapPlan([metall, kunststoff, textil], alle, keine, keine, ["maf-kunststoff", "maf-textil"]);
  assert.deepEqual(plan, [
    { mapId: "maf-kunststoff", ziel: 4, vorhanden: 0, geteilt: 2, neu: 2 },
    { mapId: "maf-textil", ziel: 5, vorhanden: 0, geteilt: 2, neu: 3 },
  ]);
  // Veröffentlichte und verworfene Einheiten zählen nicht als neu.
  const pub = new Map([["maf-textil", new Set(["LF1-1-u1"])]]);
  const verworfen = new Map([["maf-textil", new Set(["LF1-1-u2"])]]);
  assert.deepEqual(mapPlan([textil], alle, pub, verworfen, ["maf-textil"]), [
    { mapId: "maf-textil", ziel: 5, vorhanden: 1, geteilt: 2, neu: 1 },
  ]);
});

test("SIN-479: erst Metall, dann Industriekaufleute, dann die Schwerpunkte", () => {
  const metallFertig = new Map([["maf-metall", slotsOf("maf-metall")]]);
  const beideFertig = new Map([...metallFertig, ["indkfl", slotsOf("indkfl")]]);
  assert.equal(chooseRunMap(alle, keine, keine, null), "maf-metall");
  assert.equal(chooseRunMap(alle, metallFertig, keine, "maf-metall"), "indkfl");
  assert.equal(chooseRunMap(alle, beideFertig, keine, "indkfl"), "maf-kunststoff");
  assert.equal(chooseRunMap(alle, beideFertig, keine, "maf-kunststoff"), "maf-kunststoff");
  const kunststoffFertig = new Map([...beideFertig, ["maf-kunststoff", slotsOf("maf-kunststoff")]]);
  assert.equal(chooseRunMap(alle, kunststoffFertig, keine, "maf-kunststoff"), "maf-textil");
  // Ohne Schalter bleiben die Schwerpunkte außen vor.
  assert.equal(chooseRunMap(buildQueue([indkfl, metall, kunststoff, textil], ["M0"], SUPPORTED_MAP_IDS), beideFertig, keine, null), null);
});

test("SIN-479: Lauf-Bericht nennt je Map Ziel, vorhanden, geteilt, neu", () => {
  const r = {
    runId: "x", mode: "dry-run", startedAt: "2026-10-12T00:00:00Z", mapId: null, moduleId: null,
    nextModuleId: null, resumeModuleId: null, generated: 0, passed: 0, discarded: 0, discardedUnitIds: [],
    deferred: 0, repair: { ran: false, costEur: 0 }, sourceRefresh: { units: 0, replaced: 0, changeKeys: [] },
    model: "m", costEur: 0, capEur: 20, stopReason: null, safetySampleUnitIds: [], batchIds: [],
    mapPlan: [{ mapId: "maf-textil", ziel: 5, vorhanden: 1, geteilt: 2, neu: 1 }],
  } as unknown as RunReport;
  assert.match(linearSummary(r), /maf-textil: 5 \/ 1 \/ 2 \/ 1/);
});
