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
  eurPerUnit,
  missingSecrets,
  COST_MARGIN,
  nextOpenItem,
  nextOpenItems,
  pendingSlots,
  pickSafetySample,
  RUN_CAP_EUR,
  RUN_STOP_EUR,
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

test("Lauf wechselt die Map ab: nach Metall kommt indkfl, danach wieder Metall", () => {
  assert.equal(chooseRunMap(beide, keine, keine, null), "maf-metall");
  assert.equal(chooseRunMap(beide, keine, keine, "maf-metall"), "indkfl");
  assert.equal(chooseRunMap(beide, keine, keine, "indkfl"), "maf-metall");
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
