import assert from "node:assert/strict";
import test from "node:test";
import type { Curriculum, CurriculumModule } from "@/lib/content/curriculum";
import type { BatchChunkTarget } from "./batch-generate";
import {
  affectedUnitIds,
  affordableUnits,
  buildQueue,
  changeKey,
  eurPerUnit,
  missingSecrets,
  nextOpenItem,
  pendingSlots,
  pickSafetySample,
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
