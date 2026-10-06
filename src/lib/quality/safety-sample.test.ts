import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadAllCurricula } from "@/lib/content/curriculum";
import {
  buildSafetySample,
  checkUnitSource,
  drawSample,
  isSafetyUnit,
  renderReport,
  type SampleUnit,
} from "./safety-sample";

const curricula = loadAllCurricula();
const GOOD_URL = curricula.find((c) => c.id === "maf-metall")!.sources[0]!.url;

const unit = (id: string, over: Partial<SampleUnit> = {}): SampleUnit => ({
  id,
  title: `Einheit ${id}`,
  sourceUrl: GOOD_URL,
  sourceFetchedAt: "2026-10-02",
  moduleId: "M0",
  ...over,
});

describe("SIN-272 Sicherheits-Stichprobe", () => {
  it("zieht mit gleichem Seed dieselbe Liste, unabhängig von der Eingabereihenfolge", () => {
    const units = Array.from({ length: 40 }, (_, i) => unit(`u${String(i).padStart(2, "0")}`));
    const a = drawSample(units, 8, 272).map((u) => u.id);
    const b = drawSample([...units].reverse(), 8, 272).map((u) => u.id);
    assert.deepEqual(a, b);
    assert.equal(new Set(a).size, 8);
    assert.notDeepEqual(a, drawSample(units, 8, 273).map((u) => u.id));
  });

  it("erkennt sicherheitsrelevante Einheiten per Flag, Block oder Titel", () => {
    const metall = curricula.find((c) => c.id === "maf-metall")!;
    const safetyBlock = metall.modules.flatMap((m) => m.blocks.map((b) => ({ m, b }))).find(({ b }) => b.safety)!;
    assert.ok(isSafetyUnit(unit("a", { safetyFlag: true })));
    assert.ok(isSafetyUnit(unit("b", { title: "Umgang mit Gefahrstoffen" })));
    assert.ok(isSafetyUnit(unit("c", { moduleId: safetyBlock.m.id, blockId: safetyBlock.b.id }), metall));
    assert.ok(!isSafetyUnit(unit("d", { title: "Ausbildungsvertrag" })));
  });

  it("meldet fehlende Quelle und fehlendes oder ungültiges Abrufdatum", () => {
    const today = "2026-10-06";
    assert.deepEqual(checkUnitSource(unit("a"), curricula, today).problems, []);
    assert.deepEqual(checkUnitSource(unit("b", { sourceUrl: "" }), curricula, today).problems, ["quelle-fehlt"]);
    assert.deepEqual(checkUnitSource(unit("c", { sourceFetchedAt: "" }), curricula, today).problems, ["abrufdatum-fehlt"]);
    assert.deepEqual(checkUnitSource(unit("d", { sourceFetchedAt: "gestern" }), curricula, today).problems, ["abrufdatum-ungueltig"]);
    assert.deepEqual(checkUnitSource(unit("e", { sourceFetchedAt: "2027-01-01" }), curricula, today).problems, ["abrufdatum-in-zukunft"]);
    assert.deepEqual(checkUnitSource(unit("f", { sourceUrl: "kein link" }), curricula, today).problems, ["quelle-keine-url"]);
    assert.deepEqual(
      checkUnitSource(unit("g", { sourceUrl: "https://example.org/blog" }), curricula, today).problems,
      ["quelle-nicht-in-lehrplan"],
    );
  });

  it("baut Bericht mit Seed, offener Bestätigung und ohne Bewertung", () => {
    const units = [unit("s1", { safetyFlag: true }), unit("s2", { safetyFlag: true, sourceUrl: "" }), unit("n1")];
    const r = buildSafetySample(units, curricula, { seed: 272, size: 5, today: "2026-10-06" });
    assert.equal(r.safetyUnits, 2);
    assert.equal(r.checks.length, 2);
    const md = renderReport(r, { date: "2026-10-06", source: "Test" });
    assert.match(md, /Seed: 272/);
    assert.match(md, /s2: Quelle fehlt/);
    assert.match(md, /\| offen \|/);
    assert.match(md, /Offen\. Die Prüfperson/);
  });

  it("leere Stichprobe ist im Bericht kein Beleg", () => {
    const r = buildSafetySample([], curricula, { seed: 1, size: 5, today: "2026-10-06" });
    assert.match(renderReport(r, { date: "2026-10-06", source: "Test" }), /kein Beleg/);
  });
});
