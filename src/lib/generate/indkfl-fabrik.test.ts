import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadAllCurricula } from "@/lib/content/curriculum";
import { annotateUnit, mergePhaseLernfeld, moduleChunks } from "./batch-generate";
import { buildQueue, MAP_COURSES, nextOpenItems } from "./content-grow";
import type { GeneratedUnit } from "./maf-lernfeld-seed";

const curricula = loadAllCurricula();
const indkfl = curricula.find((c) => c.id === "indkfl")!;

test("Echte Queue: alle indkfl-Module stehen drin und sind unterstützt", () => {
  const ik = buildQueue(curricula).filter((q) => q.mapId === "indkfl");
  assert.equal(ik.length, indkfl.modules.length);
  assert.ok(ik.every((q) => q.supported && !q.shared));
});

test("Probelauf ohne Kosten: indkfl-Einheiten tragen amtliche Quelle und Abrufdatum", () => {
  const plan = nextOpenItems(
    buildQueue(curricula).filter((q) => q.mapId === "indkfl"),
    new Set(),
    new Set(),
    null,
    5,
  );
  const target = moduleChunks(plan[0]!.item.module)[0]!;
  const roh = {
    id: `${target.block.id}-u1`,
    title: "Probe",
    minutes: 7,
    explanation: "",
    questions: [],
  } as unknown as GeneratedUnit;
  const unit = annotateUnit(roh, { module: target.module, block: target.block }, indkfl);
  assert.ok(indkfl.sources.map((s) => s.url).includes(unit.sourceUrl), unit.sourceUrl);
  assert.match(unit.sourceFetchedAt, /^\d{4}-\d{2}-\d{2}/);
  const lf = mergePhaseLernfeld([unit], { id: "indkfl-fabrik", title: indkfl.title });
  assert.equal(lf.id, "indkfl-fabrik");
  assert.equal(lf.units.length, 1);
});

test("Migration legt Kurs und alle Quellen der Map mit Abrufdatum an", () => {
  const sql = readFileSync("supabase/migrations/20261012010000_sin431_kurs_indkfl.sql", "utf8");
  assert.ok(sql.includes(MAP_COURSES.indkfl!.courseId));
  for (const s of indkfl.sources) {
    assert.ok(sql.includes(s.url), `Quelle fehlt in der Migration: ${s.url}`);
    assert.ok(sql.includes(s.fetchedAt));
  }
  assert.ok(!/\b(drop|truncate|delete)\b/i.test(sql.replace(/--.*$/gm, "")));
});
