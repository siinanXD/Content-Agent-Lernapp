import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadMafCurriculum,
  sumBlockUnitBudget,
  sumExamWeights,
  sumQuestionTypeMix,
  sumYearRlpHours,
  sumYearUnitBudget,
} from "./maf-curriculum";

describe("maf-curriculum (AP-13)", () => {
  const curriculum = loadMafCurriculum();
  const year1 = curriculum.years.find((y) => y.year === 1)!;
  const year2 = curriculum.years.find((y) => y.year === 2)!;

  it("is a 2-year Metall curriculum with optional § 10 Anschluss only", () => {
    assert.equal(curriculum.occupation.durationYears, 2);
    assert.match(curriculum.occupation.schwerpunkt, /Metall/);
    assert.equal(curriculum.anschlussmodul.optional, true);
    assert.equal(curriculum.years.length, 2);
  });

  it("sums school hours to 320 / 280 (KMK IM LF 1–9)", () => {
    assert.equal(curriculum.axes.schule.year1Hours, 320);
    assert.equal(curriculum.axes.schule.year2Hours, 280);
    assert.equal(sumYearRlpHours(year1), 320);
    assert.equal(sumYearRlpHours(year2), 280);
    assert.equal(year1.rlpHours, 320);
    assert.equal(year2.rlpHours, 280);
  });

  it("sums Lernfeld unit budgets to 32 / 28 (total 60)", () => {
    assert.equal(sumYearUnitBudget(year1), 32);
    assert.equal(sumYearUnitBudget(year2), 28);
    assert.equal(year1.unitBudget, 32);
    assert.equal(year2.unitBudget, 28);
    assert.equal(curriculum.unitBudgetRule.totalLernfeldUnits, 60);
    assert.equal(
      year1.unitBudget + year2.unitBudget,
      curriculum.unitBudgetRule.totalLernfeldUnits,
    );
  });

  it("keeps block unit budgets equal to each Lernfeld budget", () => {
    for (const year of curriculum.years) {
      for (const lf of year.lernfelder) {
        assert.equal(
          sumBlockUnitBudget(lf),
          lf.unitBudget,
          `${lf.id} blocks ${sumBlockUnitBudget(lf)} != ${lf.unitBudget}`,
        );
        assert.equal(
          lf.unitBudget,
          lf.rlpHours / curriculum.unitBudgetRule.divisor,
          `${lf.id} unitBudget must be rlpHours/10`,
        );
        assert.ok(lf.blocks.length >= 2);
        for (const block of lf.blocks) {
          assert.ok(block.aoRefs.length > 0, `${block.id} missing AO refs`);
          assert.ok(block.lfSource.length > 0, `${block.id} missing LF source`);
          assert.ok(block.examRefs.length > 0, `${block.id} missing exam refs`);
          assert.doesNotMatch(
            `${block.title} ${block.lfSource}`.toLowerCase(),
            /ihk[- ]?prüfungsaufgabe|exam copy|personenbezogen/,
          );
        }
      }
    }
  });

  it("weights Abschlussprüfung 50/30/20 and question mix to 1.0", () => {
    assert.equal(sumExamWeights(curriculum), 1);
    assert.equal(
      curriculum.examModules.abschlusspruefung.writtenWeights.produktionstechnik,
      0.5,
    );
    assert.equal(
      curriculum.examModules.abschlusspruefung.writtenWeights.produktionsplanung,
      0.3,
    );
    assert.equal(curriculum.examModules.abschlusspruefung.writtenWeights.wiso, 0.2);
    assert.ok(Math.abs(sumQuestionTypeMix(curriculum.questionTypeMix) - 1) < 1e-9);
  });

  it("stores official sources with fetch dates and no IHK task copies", () => {
    assert.ok(curriculum.sources.length >= 6);
    assert.ok(curriculum.sources.some((s) => s.url.includes("gesetze-im-internet.de")));
    assert.ok(curriculum.sources.some((s) => s.url.includes("kmk.org")));
    for (const s of curriculum.sources) {
      assert.match(s.url, /^https:\/\//);
      assert.match(s.fetchedAt, /^\d{4}-\d{2}-\d{2}/);
      assert.doesNotMatch(s.title.toLowerCase(), /prüfungsaufgabe kopieren|ihk original/);
    }
  });

  it("records timed AO weeks 52 / 52 for Metall", () => {
    assert.equal(curriculum.axes.betrieb.year1WeeksTimed, 52);
    assert.equal(curriculum.axes.betrieb.year2WeeksTimedMetall, 52);
    assert.equal(year1.aoWeeksTimed, 52);
    assert.equal(year2.aoWeeksTimed, 52);
  });
});
