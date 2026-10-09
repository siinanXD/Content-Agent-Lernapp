import assert from "node:assert/strict";
import { test } from "node:test";
import { annotation, measure, summary, verdict, violations } from "../../../scripts/performance-budget.mjs";

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

test("Toleranz gilt für LCP und TBT, nicht für CLS und JS", () => {
  assert.deepEqual(violations({ lcpMs: 2672, cls: 0.05, tbtMs: 320, jsKb: 200 }, limit, 0.1), []);
  const over = violations({ lcpMs: 2750, cls: 0.1, tbtMs: 330, jsKb: 251 }, limit, 0.1);
  assert.equal(over.length, 4);
  assert.match(over[0], /mit Toleranz 2750/);
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

test("SIN-455: Anmerkungen sind einzeilig, Titel ohne Komma", () => {
  assert.equal(annotation("error", "Leistungsbudget /, x", "a\nb::c"), "::error title=Leistungsbudget /; x::a b: c");
  assert.equal(summary({ lcpMs: 2100, cls: 0, tbtMs: 40, jsKb: 180 }, limit), "LCP 2100 ms (Grenze 2500 ms), CLS 0 (Grenze 0.1), TBT 40 ms (Grenze 300 ms), JS 180 KB (Grenze 250 KB)");
});

test("SIN-455: Ausreißer wird nachgemessen, rot nur wenn auch die Nachmessung reißt", () => {
  const ok = { measured: { lcpMs: 2000, cls: 0, tbtMs: 40, jsKb: 180 }, over: [] as string[] };
  const bad = { measured: { lcpMs: 2900, cls: 0, tbtMs: 40, jsKb: 180 }, over: ["LCP 2900 ms (Grenze 2500 ms, mit Toleranz 2750)"] };
  const pass = verdict("/", ok, null, limit);
  assert.equal(pass.ok, true);
  assert.equal(pass.retried, false);
  assert.deepEqual(pass.notes.map((n) => n.split(" ")[0]), ["::notice"]);

  const flake = verdict("/lernpfad", bad, ok, limit);
  assert.equal(flake.ok, true);
  assert.equal(flake.retried, true);
  assert.match(flake.notes[0]!, /^::warning title=Leistungsbudget \/lernpfad::Erste Messung über der Grenze: LCP 2900 ms.*Nachmessung: im Budget\.$/);
  assert.equal(flake.measured.lcpMs, 2000);

  const real = verdict("/start", bad, bad, limit);
  assert.equal(real.ok, false);
  assert.ok(real.notes.some((n) => n.startsWith("::error title=Leistungsbudget /start::LCP 2900 ms")));
  assert.match(real.notes[0]!, /Nachmessung: wieder über der Grenze/);
});
