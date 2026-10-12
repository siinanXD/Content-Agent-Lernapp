# SIN-478: Kostendeckel je Kurslauf auch mit Reparatur einhalten

- Links: https://linear.app/sinan-kahraman/issue/SIN-478, Lauf-Bericht `docs/ops/content-runs/2026-10-12T09-44-47-533Z.json`, AGENTS.md (Stopp-Regel 20 € je Kurslauf), `scripts/content-grow.ts`, `scripts/ap15-regen-dropped.ts`, `src/lib/quality/run-ledger.ts`, `src/lib/quality/cost-guard.ts`
- Entscheidung:
  1. **Ursache aus dem Lauf-Bericht:** Die Reparatur kostete 2,90 €, danach ein einziger Batch mit 318 Einheiten. Er war mit 0,041 € je Einheit geplant (Lauf 10-08), kostete aber 0,059 € je Einheit. Der Richter lief nach dem Batch ohne Prüfung. Gesamt 21,78 €.
  2. **Planung** (`planEurPerUnit` in `src/lib/generate/content-grow.ts`): teuerster bisheriger Lauf je Einheit statt Durchschnitt. Mit den zwei Läufen plant der nächste Lauf mit 0,059 €.
  3. **Vor dem Batch** (`scripts/content-grow.ts`): Summe inklusive Reparatur plus erwartete Batch-Kosten (Einheiten × Kosten je Einheit × 1,25) gegen 20 € prüfen.
  4. **Vor dem Richter** (`judge()`): Summe plus `judgeReserveEur(Einheiten)` gegen 20 € prüfen. Reicht es nicht, wird nicht gerichtet; die Einheiten werden nicht veröffentlicht, der Stopp steht im Bericht.
  5. **Reparatur** (`--stop-eur 17`): die Reparaturstufe stoppt vor 17 €, damit ihr letzter Batch (Reserve 3 €) im Deckel bleibt.
  6. **Ledger** (`toRunCostRecord`): `cost_usd` = `cost_eur` / `EUR_PER_USD`, beide aus derselben Summe inkl. Reparatur.
- Annahmen:
  - Kosten je Einheit sind über zwei gemessene Läufe bekannt (0,041 und 0,059 €). Ein dritter Ausreißer oberhalb des Maximums kann die Vorab-Rechnung weiterhin unterschreiten. Der Richter-Gate fängt nur den Richter-Teil ab, nicht einen teureren Claude-Batch. Ein harter Schutz vor jedem Batch ist mit der Batch-API nicht möglich, weil die Kosten erst nach dem Absenden bekannt sind.
  - Die Reserve der Reparatur (3 €) stammt aus dem einen gemessenen Lauf (2,90 €). Ein größerer Reparatur-Batch würde den Deckel trotzdem reißen.
  - Der Richter nutzt 6 Fragen je Einheit (wie `phaseAPreflightUsd`). Das ist eine Annahme, keine Messung.
  - `EUR_PER_USD` (20/21,5) bleibt die Umrechnung der Guard-Schätzung; sie wird nicht an den Kurs angepasst.
- Warum: Der Deckel ist eine Stopp-Regel in AGENTS.md (20 € je Kurslauf). Ein Stopp erst nach dem Überschreiten war zu spät. Die Vorab-Rechnung mit dem teuersten Lauf ist die einfachste Änderung, die den bezahlten Batch im Deckel hält, ohne Einheiten wegzuwerfen.
