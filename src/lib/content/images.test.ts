import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPhaseAImage,
  chartSvg,
  PHASE_A_LICENSE,
  sketchSvg,
  safetySignSvg,
} from "./images";

describe("image pipeline helpers (AP-18d)", () => {
  it("accepts Phase A generated SVG with license", () => {
    const errors = assertPhaseAImage({
      src: "/generated/lockout-flow.svg",
      alt: "Ablauf Freischalten",
      kind: "flow",
      source: { url: "local", license: PHASE_A_LICENSE },
    });
    assert.deepEqual(errors, []);
  });

  it("rejects missing license and non-svg", () => {
    const errors = assertPhaseAImage({
      src: "/photo.png",
      alt: "x",
      kind: "schema",
      source: { url: "x", license: "" },
    });
    assert.ok(errors.length >= 2);
  });

  it("renders sketch and chart SVG templates with text labels", () => {
    assert.match(sketchSvg({ title: "Platte", widthLabel: "120 mm", heightLabel: "40 mm" }), /120 mm/);
    assert.match(chartSvg({ title: "Kosten", aLabel: "Rüst", aValue: 20, bLabel: "Stück", bValue: 80 }), /Rüst/);
    assert.match(safetySignSvg(), /Gehörschutz/);
  });
});
