import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { addClaudeMeasuredUsage, addOpenAIUsage, emptyLedger } from "./cost-guard";
import {
  assertWithinRunCap,
  clearMockRunCosts,
  listRunCosts,
  recordRunCost,
  RunBudgetExceededError,
  toRunCostRecord,
} from "./run-ledger";
import { summarizeRunCosts } from "../../../scripts/autonomy/planner.mjs";

describe("Kosten-Ledger je Pipeline-Lauf (SIN-258)", () => {
  afterEach(() => clearMockRunCosts());

  it("stoppt den Lauf ab 20 € (Unit-Test)", () => {
    assert.doesNotThrow(() => assertWithinRunCap(19.99));
    assert.throws(() => assertWithinRunCap(20), RunBudgetExceededError);
    assert.throws(() => assertWithinRunCap(25.5), /Kostendeckel/);
  });

  it("markiert einen Lauf über dem Deckel als gestoppt", () => {
    // 5 Mio. Output-Token Claude (Batch) = 25 $ ≈ 23 €
    const ledger = addClaudeMeasuredUsage(emptyLedger(), { input_tokens: 0, output_tokens: 5_000_000 });
    const rec = toRunCostRecord({ runId: "r1", courseId: "c1", kind: "test", ledger });
    assert.equal(rec.stopped, true);
    assert.ok(rec.costEur >= 20);
    assert.match(rec.stopReason ?? "", /≥/);
  });

  it("schreibt ins Mock-Ledger ohne Live-Keys und enthält nur Kennungen und Zahlen", async () => {
    let ledger = addClaudeMeasuredUsage(emptyLedger(), {
      input_tokens: 1000,
      output_tokens: 2000,
      cache_read_input_tokens: 500,
    });
    ledger = addOpenAIUsage(ledger, 3000, 400);
    const rec = await recordRunCost({ runId: "r2", courseId: "c2", kind: "content-grow", ledger });
    assert.equal(rec.stopped, false);
    assert.equal(rec.claudeCacheReadTokens, 500);
    assert.equal(rec.openaiInputTokens, 3000);
    const rows = await listRunCosts();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.runId, "r2");
    assert.ok(Object.keys(rows[0]!).every((k) => !/prompt|name|mail|user/i.test(k)));
  });

  it("totalEur aus Fremdkosten (Reparatur) zählt gegen den Deckel", () => {
    const rec = toRunCostRecord({ runId: "r3", courseId: "c3", kind: "t", ledger: emptyLedger(), totalEur: 20.4 });
    assert.equal(rec.stopped, true);
    assert.equal(rec.costEur, 20.4);
  });

  it("Planer-Kennzahl kosten_pro_lauf", () => {
    assert.equal(summarizeRunCosts([]), "keine Läufe im Ledger");
    const s = summarizeRunCosts([
      { cost_eur: 4, stopped: false },
      { cost_eur: 20.5, stopped: true },
    ]);
    assert.match(s, /Ø 12\.25 €/);
    assert.match(s, /letzter 4\.00 €/);
    assert.match(s, /höchster 20\.50 €/);
    assert.match(s, /1 gestoppt/);
  });
});
