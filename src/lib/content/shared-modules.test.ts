import assert from "node:assert/strict";
import test from "node:test";
import { phaseAChunks } from "@/lib/generate/batch-generate";
import {
  checkSharedModule,
  loadMafCurricula,
  modulesToGenerate,
  neutralSharedModuleIds,
} from "./shared-modules";

test("7 MAF-Maps liegen vor", () => {
  assert.equal(loadMafCurricula().length, 7);
});

test("M0 ist in allen Maps identisch und schwerpunktneutral", () => {
  const r = checkSharedModule("M0", loadMafCurricula());
  assert.equal(r.identical, true);
  assert.deepEqual(r.termHits, []);
  assert.ok(neutralSharedModuleIds().includes("M0"));
});

test("PA ist Schwerpunkt-spezifisch und wird nicht geteilt", () => {
  const r = checkSharedModule("PA", loadMafCurricula());
  assert.equal(r.identical, false);
  assert.equal(neutralSharedModuleIds().includes("PA"), false);
});

test("Generator überspringt veröffentlichte Shared-Module", () => {
  const mods = [{ id: "M0" }, { id: "LF1" }, { id: "PA" }];
  const shared = ["M0"];
  const { generate, skipped } = modulesToGenerate(mods, new Set(["M0", "PA"]), shared);
  assert.deepEqual(skipped.map((m) => m.id), ["M0"]);
  assert.deepEqual(generate.map((m) => m.id), ["LF1", "PA"]);
  // Nicht veröffentlicht → wird erzeugt.
  const again = modulesToGenerate(mods, new Set(), shared);
  assert.deepEqual(again.generate.map((m) => m.id), ["M0", "LF1", "PA"]);
});

test("Phase A erzeugt M0 nicht doppelt, wenn veröffentlicht", () => {
  const before = phaseAChunks("A");
  const after = phaseAChunks("A", undefined, new Set(["M0"]));
  assert.ok(before.targets.some((t) => t.module.id === "M0"));
  assert.equal(after.targets.some((t) => t.module.id === "M0"), false);
  assert.ok(after.unitTarget < before.unitTarget);
  // PA ist nicht geteilt und bleibt im Auftrag.
  const paBefore = before.targets.filter((t) => t.module.id === "PA").length;
  const paAfter = phaseAChunks("A", undefined, new Set(["PA"])).targets.filter(
    (t) => t.module.id === "PA",
  ).length;
  assert.equal(paAfter, paBefore);
});
