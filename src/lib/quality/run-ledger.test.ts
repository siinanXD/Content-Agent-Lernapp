import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { addClaudeMeasuredUsage, addOpenAIUsage, EUR_PER_USD, emptyLedger } from "./cost-guard";
import {
  assertWithinRunCap,
  clearMockRunCosts,
  listRunCosts,
  recordRunCost,
  RunBudgetExceededError,
  toRunCostRecord,
} from "./run-ledger";
import { summarizeRunCosts, summarizeWeekCosts } from "../../../scripts/autonomy/planner.mjs";

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

  it("schreibt einen Lauf über dem Deckel als gestoppt ins Ledger (SIN-280)", async () => {
    const ledger = addClaudeMeasuredUsage(emptyLedger(), { input_tokens: 0, output_tokens: 5_000_000 });
    await recordRunCost({ runId: "r4", courseId: "c4", kind: "content-grow", ledger });
    const [row] = await listRunCosts();
    assert.equal(row!.runId, "r4");
    assert.equal(row!.stopped, true);
    assert.equal(row!.capEur, 20);
    assert.ok(row!.costEur >= 20);
  });

  it("SIN-478: cost_usd und cost_eur stimmen über EUR_PER_USD überein, auch mit Reparatur", () => {
    // Lauf 10-12: Ledger 18,89 € (20,30 $), Reparatur 2,90 €, Summe 21,78 €.
    const ledger = { ...emptyLedger(), usdEstimate: 20.3, eurEstimate: 18.89 };
    const withRepair = toRunCostRecord({
      runId: "r5", courseId: "c5", kind: "content-grow", ledger, totalEur: 21.78,
    });
    assert.equal(withRepair.costEur, 21.78);
    assert.ok(Math.abs(withRepair.costUsd * EUR_PER_USD - withRepair.costEur) < 0.01);
    assert.equal(withRepair.stopped, true);

    const ledgerOnly = addClaudeMeasuredUsage(emptyLedger(), { input_tokens: 0, output_tokens: 1_000_000 });
    const rec = toRunCostRecord({ runId: "r6", courseId: "c6", kind: "t", ledger: ledgerOnly });
    assert.ok(Math.abs(rec.costUsd * EUR_PER_USD - rec.costEur) < 0.01);
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

  it("Planer-Kennzahl kosten_woche mit Warnung über 2 x Deckel", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    const alt = { cost_eur: 30, created_at: "2026-10-01T00:00:00Z" };
    const ok = summarizeWeekCosts([{ cost_eur: 15, created_at: "2026-10-12T00:00:00Z" }, alt], 20, now);
    assert.equal(ok, "15.00 € in 1 Läufen (letzte 7 Tage)");
    const warn = summarizeWeekCosts(
      [{ cost_eur: 21.78, created_at: "2026-10-12T00:00:00Z" }, { cost_eur: 20.43, created_at: "2026-10-09T00:00:00Z" }, alt],
      20,
      now,
    );
    assert.match(warn, /^42\.21 € in 2 Läufen/);
    assert.match(warn, /WARNUNG/);
    assert.equal(summarizeWeekCosts([alt], 20, now), "keine Läufe in den letzten 7 Tagen");
  });
});
