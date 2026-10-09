import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { INDKFL_GOLDSET, INDKFL_GOLDSET_ITEMS, indkflGegenproben } from "./indkfl-goldset";
import { scoresPass } from "./schemas";

type Map = { sources: { id: string; url: string; kind: string }[]; modules: { id: string; blocks: { id: string; safety?: boolean }[] }[] };
const map = JSON.parse(readFileSync("docs/content/indkfl.json", "utf8")) as Map;

test("SIN-447: Goldset Industriekaufleute ist vollständig und eindeutig", () => {
  assert.equal(INDKFL_GOLDSET.itemCount, INDKFL_GOLDSET_ITEMS.length);
  assert.ok(INDKFL_GOLDSET_ITEMS.length >= 30);
  assert.equal(new Set(INDKFL_GOLDSET_ITEMS.map((q) => q.id)).size, INDKFL_GOLDSET_ITEMS.length);
  assert.match(INDKFL_GOLDSET.status, /Geprüft durch Sinan/);
});

test("SIN-447: jede Frage hat eine amtliche Quelle aus der Map, keine IHK-Aufgabe", () => {
  const byUrl = new Map(map.sources.map((s) => [s.url, s.kind]));
  for (const q of INDKFL_GOLDSET_ITEMS) {
    assert.ok(byUrl.has(q.sourceUrl), `${q.id}: Quelle ${q.sourceUrl} nicht in indkfl.json`);
    assert.equal(q.sourceKind, byUrl.get(q.sourceUrl), `${q.id}: Quellenart`);
    assert.equal(q.ihkExamCopy, false, q.id);
    assert.ok(q.sourceFetchedAt, q.id);
    assert.ok(q.prompt.trim() && q.correct.trim() && q.explanation.trim(), q.id);
  }
  for (const url of INDKFL_GOLDSET.sources) assert.ok(byUrl.has(url), url);
});

test("SIN-447: Phase A mit mindestens 5 Fragen je Modul, Blöcke existieren, Sicherheit passt zur Map", () => {
  const blocks = new Map(map.modules.flatMap((m) => m.blocks.map((b) => [b.id, { module: m.id, safety: Boolean(b.safety) }] as const)));
  for (const mod of INDKFL_GOLDSET.phaseAModules) {
    const own = INDKFL_GOLDSET_ITEMS.filter((q) => q.moduleId === mod && !q.gegenprobe);
    assert.ok(own.length >= INDKFL_GOLDSET.phaseAItemsPerModule, `${mod}: ${own.length}`);
  }
  for (const q of INDKFL_GOLDSET_ITEMS.filter((x) => x.moduleId !== "VO")) {
    const b = blocks.get(q.unitId);
    assert.ok(b, `${q.id}: Block ${q.unitId} fehlt in der Map`);
    assert.equal(b!.module, q.moduleId, q.id);
    if (!q.gegenprobe) assert.equal(q.expected.safetyFlag, b!.safety, `${q.id}: Sicherheit`);
  }
});

test("SIN-447: Gegenproben fallen durch, alle anderen bestehen die Schwelle", () => {
  const gp = indkflGegenproben();
  assert.ok(gp.length >= 3);
  for (const q of gp) assert.equal(scoresPass(q.expected), false, q.id);
  for (const q of INDKFL_GOLDSET_ITEMS.filter((x) => !x.gegenprobe)) assert.equal(scoresPass(q.expected), true, q.id);
  // Jede Art von Fehler einmal: Quellentreue, Eindeutigkeit, Niveau oder Sprache.
  assert.ok(gp.some((q) => q.expected.sourceFidelity === 0));
  assert.ok(gp.some((q) => q.expected.uniqueness === 0));
  assert.ok(gp.some((q) => q.expected.niveau < 4 || q.expected.language < 4));
});
