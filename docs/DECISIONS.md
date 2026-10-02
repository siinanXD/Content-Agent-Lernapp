### D-16 — AP-04 Plan: deterministic MAF day plans (2 variants) without API key

- **Links:** MaschFüAusbV §4 Berufsbild / §8–§9 Prüfung; KMK RLP MAF (verweist auf verwandte Metall-RLPs); PRODUCT.md (2–3 h/Tag, 5–10 min Einheiten); `src/lib/plan/maf-plan-seed.ts`
- **Entscheidung:** Seed liefert **Prüfungsvorbereitung 2 Monate (40 Tage × 2,5 h)** und **Weiterbildung 3 Monate (60 Tage × 2 h)** als JSON; Topics aus AO/RLP/Prüfungsstruktur (keine IHK-Aufgaben). Live-Pfad `claude-sonnet-5-5` structured JSON wenn Key da.
- **Warum:** SIN-182 Akzeptanz = Tagesplan für 2 Varianten; ohne Anthropic-Key darf AP-04 nicht blockieren.
