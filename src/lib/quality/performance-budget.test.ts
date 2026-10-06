import assert from "node:assert/strict";
import { test } from "node:test";
import { measure, violations } from "../../../scripts/performance-budget.mjs";

const limit = { lcpMs: 2500, cls: 0.1, tbtMs: 300, jsKb: 250 };

test("Messung im Budget: keine Verletzung", () => {
  assert.deepEqual(violations({ lcpMs: 1800, cls: 0, tbtMs: 50, jsKb: 180 }, limit), []);
});

test("jede überschrittene Grenze wird genannt", () => {
  const over = violations({ lcpMs: 2600, cls: 0.1, tbtMs: 10, jsKb: 251 }, limit);
  assert.equal(over.length, 3);
  assert.match(over[0], /^LCP 2600 ms/);
  assert.match(over[1], /^CLS 0.1 /);
  assert.match(over[2], /^JS 251 KB/);
});

test("measure nimmt den Median und rechnet JS in KB", () => {
  const lhr = (lcp: number, bytes: number) => ({
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "cumulative-layout-shift": { numericValue: 0.02 },
      "total-blocking-time": { numericValue: 40 },
      "resource-summary": { details: { items: [{ resourceType: "script", transferSize: bytes }] } },
    },
  });
  const m = measure([lhr(3000, 204800), lhr(1000, 102400), lhr(2000, 153600)]);
  assert.deepEqual(m, { lcpMs: 2000, cls: 0.02, tbtMs: 40, jsKb: 150 });
});
