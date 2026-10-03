import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockSources,
  curriculumTotals,
  loadMafCurriculum,
  modulesForPhase,
} from "./maf-curriculum";

const c = loadMafCurriculum();

describe("AP-13 MAF curriculum map", () => {
  it("plans two training years (§ 2 MaschFüAusbV), not three", () => {
    assert.equal(c.durationYears, 2);
    assert.match(c.durationNote, /§ 2/);
    assert.match(c.durationNote, /§ 10/);
    for (const m of c.modules) assert.ok(m.year === 1 || m.year === 2, m.id);
  });

  it("matches the KMK Rahmenlehrplan hours: 320 (year 1) and 280 (year 2)", () => {
    const t = curriculumTotals(c);
    assert.equal(t.rlpHoursYear1, 320);
    assert.equal(t.rlpHoursYear2, 280);
    const lfNrs = c.modules
      .filter((m) => m.kind === "lernfeld")
      .map((m) => m.rlpLernfeld!.nr)
      .sort((a, b) => a - b);
    assert.deepEqual(lfNrs, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("matches the Ausbildungsrahmenplan: 52 weeks per year", () => {
    for (const key of ["year1", "year2"] as const) {
      const weeks = c.aoZeitrahmen[key].rows.reduce((s, r) => s + (r.weeks ?? 0), 0);
      assert.equal(weeks, 52, key);
    }
    assert.equal(c.aoBerufsbild.length, 14);
  });

  it("keeps block units consistent with module targets and stored totals", () => {
    const ids = new Set<string>();
    for (const m of c.modules) {
      assert.ok(!ids.has(m.id), `duplicate module ${m.id}`);
      ids.add(m.id);
      const sum = m.blocks.reduce((s, b) => s + b.units, 0);
      assert.equal(sum, m.unitsTarget, `${m.id} blocks ${sum} != target ${m.unitsTarget}`);
      for (const b of m.blocks) {
        assert.ok(!ids.has(b.id), `duplicate block ${b.id}`);
        ids.add(b.id);
        assert.ok(b.units > 0 && b.topics.length > 0, b.id);
        assert.ok(blockSources(c, b).length === b.sourceIds.length, `${b.id} unknown source`);
      }
    }
    assert.deepEqual(curriculumTotals(c), c.totals);
    assert.equal(c.totals.unitsTarget, 870);
    assert.equal(c.totals.modules, 16);
  });

  it("orders modules 0..n-1 and covers every module in exactly one phase", () => {
    const orders = c.modules.map((m) => m.order).sort((a, b) => a - b);
    assert.deepEqual(orders, orders.map((_, i) => i));
    const covered = c.phases.flatMap((p) => p.moduleIds).sort();
    assert.deepEqual(covered, c.modules.map((m) => m.id).sort());
    for (const p of c.phases) {
      const units = modulesForPhase(c, p.id).reduce((s, m) => s + m.unitsTarget, 0);
      assert.equal(units, p.unitsTarget, p.id);
    }
    assert.ok(modulesForPhase(c, "A").some((m) => m.id === "M0"));
  });

  it("uses only official sources with https links and a fetch date", () => {
    assert.ok(c.sources.length >= 8);
    for (const s of c.sources) {
      assert.match(s.url, /^https:\/\/(www\.)?(gesetze-im-internet\.de|kmk\.org|bibb\.de)\//, s.id);
      assert.match(s.fetchedAt, /^\d{4}-\d{2}-\d{2}$/, s.id);
    }
    for (const m of c.modules) {
      if (m.rlpLernfeld) assert.equal(m.rlpLernfeld.sourceId, "rlp-im", m.id);
      assert.ok(m.aoPositions.length > 0, `${m.id} needs AO positions`);
    }
  });

  it("mirrors § 9: written parts weigh 50/30/20 and last 120/60/60 minutes", () => {
    const written = c.exam.abschlusspruefung.schriftlich;
    assert.deepEqual(
      written.map((w) => w.weightPercent),
      [50, 30, 20],
    );
    assert.deepEqual(
      written.map((w) => w.maxMinutes),
      [120, 60, 60],
    );
    assert.equal(c.exam.abschlusspruefung.praktisch.maxMinutes, 420);
    assert.equal(c.exam.zwischenpruefung.praktischMaxMinutes, 180);
    const areaIds = new Set([
      ...written.flatMap((w) => w.gebiete.map((g) => g.id)),
      "ZP",
    ]);
    for (const m of c.modules) {
      for (const a of m.examAreas) assert.ok(areaIds.has(a), `${m.id} unknown exam area ${a}`);
    }
    // every written exam area is covered by at least one module
    for (const id of areaIds) {
      assert.ok(c.modules.some((m) => m.examAreas.includes(id)), `no module for ${id}`);
    }
  });

  it("question mixes sum to 100 and safety blocks sit in safety modules", () => {
    assert.equal(Object.values(c.defaultQuestionMix).reduce((s, v) => s + v, 0), 100);
    for (const m of c.modules) {
      assert.equal(Object.values(m.questionMix).reduce((s, v) => s + v, 0), 100, m.id);
      if (m.blocks.some((b) => b.safety)) assert.equal(m.safety, true, m.id);
    }
  });

  it("states the no-IHK and no-PII rules", () => {
    assert.ok(c.rules.some((r) => /IHK/.test(r)));
    assert.ok(c.rules.some((r) => /Personendaten/.test(r)));
    const text = JSON.stringify(c);
    assert.doesNotMatch(text, /Original-?Prüfungsaufgabe der IHK/i);
  });
});
