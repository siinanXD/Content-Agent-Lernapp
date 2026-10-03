# AP-15 Phase A Run

**Linear:** [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193)  
**Kurs:** `e22073de-7020-4380-9002-c70d46c25e25`  
**API:** Anthropic **Console** Batch + `anthropic-workspace-id` (PR #27) — **nicht** Claude Max/Mac-Abo  
**Status:** published (quality-gate passers only)  
**Einheiten veröffentlicht:** 170 / 280 Ziel  
**Verworfen (Judge, Regen credit-blocked):** 110  
**Kosten (Schätzung):** generate+judge ~€11.83 + finish-rejudge ~€0.97 ≈ **€12.8** (Deckel €20)  
**Module published:** M0=30, LF1=46, LF2=54, PA=40

## Credit-Blocker (Console)

Regen-Batch für 110 Units → `credit balance is too low` (Console Plans & Billing).  
Claude Max/Mac bills **not** usable for Messages/Batch — only Console credits.

Batches: `msgbatch_01U7QY6f9Jdi8P6DWx3pHV4H`, `msgbatch_011tGyteLAuCp1gwLDCsF3ts`

## Artifacts

- `docs/ops/ap15-runs/2026-10-03T12-39-35-140Z-report.json`
- Safety: `docs/ops/AP15-SAFETY-SAMPLE.md` (13 sample ids)
- Learner snapshot: `src/lib/learner/phase-a-published.json` (170 units)
