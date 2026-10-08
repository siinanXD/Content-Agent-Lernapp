import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockSources,
  curriculumTotals,
  examAreaIds,
  listCurriculumFiles,
  loadAllCurricula,
  loadMafCurriculum,
  modulesForPhase,
} from "./curriculum";

const all = loadAllCurricula();

describe("AP-13 curriculum maps (docs/content/*.json)", () => {
  it("ships the two priority families: MAF (all Schwerpunkte) and Industriekaufleute", () => {
    const ids = all.map((c) => c.id).sort();
    for (const id of [
      "maf-metall",
      "maf-kunststoff",
      "maf-textil",
      "maf-textilveredelung",
      "maf-lebensmittel",
      "maf-druckverarbeitung",
      "maf-packmittel",
      "indkfl",
    ]) {
      assert.ok(ids.includes(id), `missing map ${id}`);
    }
    assert.equal(new Set(ids).size, ids.length, "duplicate map ids");
    assert.equal(listCurriculumFiles().length, all.length);
  });

  it("MAF maps plan two years (§ 2 MaschFüAusbV), Industriekaufleute three (§ 2 IndKflAusbV)", () => {
    for (const c of all) {
      if (c.family === "maf") {
        assert.equal(c.durationYears, 2, c.id);
        assert.match(c.durationNote, /§ 2/);
        for (const m of c.modules) assert.ok(m.year <= 2, `${c.id}/${m.id}`);
      }
      if (c.family === "indkfl") {
        assert.equal(c.durationYears, 3, c.id);
        assert.deepEqual(curriculumTotals(c).rlpHoursByYear, { "1": 320, "2": 280, "3": 280 });
      }
    }
    const pilot = loadMafCurriculum();
    assert.equal(pilot.id, "maf-metall");
    assert.deepEqual(curriculumTotals(pilot).rlpHoursByYear, { "1": 320, "2": 280 });
  });

  for (const c of all) {
    describe(c.id, () => {
      it("keeps block units consistent with module targets and stored totals", () => {
        const ids = new Set<string>();
        for (const m of c.modules) {
          assert.ok(!ids.has(m.id), `duplicate module ${m.id}`);
          ids.add(m.id);
          const sum = m.blocks.reduce((s, b) => s + b.units, 0);
          assert.equal(sum, m.unitsTarget, `${m.id} blocks ${sum} != target ${m.unitsTarget}`);
          assert.ok(m.blocks.length > 0, `${m.id} has no blocks`);
          for (const b of m.blocks) {
            assert.ok(!ids.has(b.id), `duplicate block ${b.id}`);
            ids.add(b.id);
            assert.ok(b.units > 0 && b.topics.length > 0, b.id);
            assert.equal(blockSources(c, b).length, b.sourceIds.length, `${b.id} unknown source`);
          }
        }
        assert.deepEqual(curriculumTotals(c), c.totals);
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
      });

      it("uses only official sources with https links and a fetch date", () => {
        assert.ok(c.sources.length >= 5);
        for (const s of c.sources) {
          const u = new URL(s.url);
          assert.equal(u.protocol, "https:", s.id);
          assert.ok(["gesetze-im-internet.de", "kmk.org", "bibb.de", "berufsbildung.nrw.de"].includes(u.hostname.replace(/^www\./, "")), s.id);
          assert.match(s.fetchedAt, /^\d{4}-\d{2}-\d{2}$/, s.id);
        }
        const refRlp = c.sources.find((s) => s.id === c.referenceRlp.sourceId);
        assert.ok(refRlp && refRlp.kind === "rahmenlehrplan", `${c.id} reference RLP must be a source`);
        for (const m of c.modules) {
          if (m.rlpLernfeld) assert.equal(m.rlpLernfeld.sourceId, c.referenceRlp.sourceId, m.id);
          assert.ok(m.aoPositions.length > 0, `${m.id} needs AO positions`);
          const bb = new Set(c.aoBerufsbild.map((b) => b.id));
          for (const p of m.aoPositions) assert.ok(bb.has(p.berufsbild), `${m.id} unknown Berufsbild ${p.berufsbild}`);
        }
      });

      it("mirrors the Anlage: numeric weeks per section sum to the expected value", () => {
        for (const sec of c.aoZeitrahmen.sections) {
          const sum = sec.rows.reduce((s, r) => s + (r.weeks ?? 0), 0);
          if (sec.expectedWeeks != null) assert.equal(sum, sec.expectedWeeks, `${c.id}/${sec.id}`);
        }
      });

      it("mirrors the exam regulation: weights sum to 100 and every area is covered", () => {
        const weights = c.exam.gradedParts.map((p) => p.weightPercent).filter((w): w is number => w != null);
        assert.equal(weights.reduce((s, w) => s + w, 0), 100, c.id);
        const areas = examAreaIds(c);
        for (const m of c.modules) for (const a of m.examAreas) assert.ok(areas.has(a), `${m.id} unknown exam area ${a}`);
        for (const p of c.exam.gradedParts) {
          const covered = c.modules.some((m) => m.examAreas.includes(p.id) || p.gebiete.some((g) => m.examAreas.includes(g.id)));
          assert.ok(covered, `${c.id}: no module covers exam part ${p.id}`);
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
      });
    });
  }
});
