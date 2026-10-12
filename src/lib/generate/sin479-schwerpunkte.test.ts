import assert from "node:assert/strict";
import test from "node:test";
import { listCurriculumFiles, loadCurriculum } from "@/lib/content/curriculum";
import { buildQueue, mapBilanz, MAP_COURSES, SUPPORTED_MAP_IDS, slotIds } from "./content-grow";
import { neutralSharedModuleIds } from "@/lib/content/shared-modules";

// SIN-479: Trockenlauf-Rechnung mit den echten Curriculum-Maps (ohne Netz, nichts veröffentlicht).
const curricula = listCurriculumFiles().map(loadCurriculum);
const queue = buildQueue(curricula);
const SCHWERPUNKTE = SUPPORTED_MAP_IDS.filter((id) => id.startsWith("maf-") && id !== "maf-metall");
const leer = new Map<string, ReadonlySet<string>>();
const bilanz = mapBilanz(curricula, queue, leer, leer);

test("SIN-479: alle 6 weiteren Schwerpunkte haben Map und Kurs-Namen", () => {
  assert.equal(SCHWERPUNKTE.length, 6);
  for (const id of SCHWERPUNKTE) {
    assert.ok(curricula.some((c) => c.id === id), id);
    assert.ok(MAP_COURSES[id]?.courseKeyword, id);
  }
});

test("SIN-479: gemeinsame Module werden in den Schwerpunkten nicht erneut geplant", () => {
  const shared = neutralSharedModuleIds();
  assert.ok(shared.length > 0);
  for (const id of SCHWERPUNKTE) {
    const eigene = queue.filter((q) => q.mapId === id);
    assert.ok(eigene.length > 0, id);
    assert.deepEqual(eigene.filter((q) => shared.includes(q.module.id)).map((q) => q.module.id), [], id);
    const b = bilanz.find((x) => x.mapId === id)!;
    const sharedSlots = curricula
      .find((c) => c.id === id)!
      .modules.filter((m) => shared.includes(m.id))
      .reduce((s, m) => s + slotIds(m).length, 0);
    assert.equal(b.geteilt, sharedSlots, id);
    assert.equal(b.neu, b.ziel - b.geteilt, id);
  }
});

test("SIN-479: geteilte Module erzeugt nur die erste MAF-Map (Metall), je einmal", () => {
  const shared = neutralSharedModuleIds();
  for (const m of shared) {
    const maps = queue.filter((q) => q.module.id === m && q.shared).map((q) => q.mapId);
    assert.deepEqual(maps, ["maf-metall"], m);
  }
});
