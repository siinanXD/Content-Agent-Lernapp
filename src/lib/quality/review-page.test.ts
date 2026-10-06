import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQuestionSample, renderReviewPage } from "./review-page";

const qu = (id: string, n: number) => ({
  id,
  title: `Einheit ${id}`,
  sourceUrl: "https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html",
  sourceFetchedAt: "2026-10-02",
  moduleId: "M0",
  safetyFlag: true,
  questions: Array.from({ length: n }, (_, i) => ({ id: `q${i}`, prompt: `Frage ${i}?`, correct: "A", explanation: "weil" })),
});

describe("SIN-278 Prüfseite", () => {
  it("zieht 10 % (mindestens 1) und rendert Ankreuzfelder mit Quelle", () => {
    const r = buildQuestionSample([qu("a", 20), qu("x", 0)], undefined, { seed: 1 });
    assert.equal(r.total, 20);
    assert.equal(r.sample.length, 2);
    const page = renderReviewPage(r, { date: "2026-10-06", source: "test", seed: 1 });
    assert.match(page, /- \[ \] passt/);
    assert.match(page, /\[https:\/\//);
  });
  it("meldet leere Auswahl ausdrücklich", () => {
    const page = renderReviewPage({ total: 0, sample: [] }, { date: "d", source: "s", seed: 1 });
    assert.match(page, /kein Beleg/);
  });
});
