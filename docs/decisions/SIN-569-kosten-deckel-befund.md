# SIN-569: Kosten je Kurslauf unter 20 €: Befund, kein neuer Code

- Links: https://linear.app/sinan-kahraman/issue/SIN-569, `docs/decisions/SIN-478-kostendeckel-lauf.md`, `docs/decisions/SIN-493-teilbatches.md`, `scripts/content-grow.ts`, `scripts/autonomy/run-task.mjs` (`costResult`)
- Entscheidung: Es kommt keine Änderung am Code. Die geforderte Schranke gibt es schon: `partGate` (Summe + Schätzung + Richter-Reserve ≤ 20 €) prüft vor jedem Teilbatch und ist in `scripts/content-grow.ts` verdrahtet. Unit-Tests: `src/lib/generate/content-grow.test.ts` (SIN-493, Simulation bleibt im Deckel, Teil startet nicht bei Überschreitung).
- Befund: Der Lauf mit 21,78 € (`docs/ops/content-runs/2026-10-12T09-44-47-533Z.json`) hatte genau einen Batch (`batchIds` mit einem Eintrag), lief also vor den Teilbatches. `costResult` wertet nur Läufe ab `TEILBATCH_SEIT` für `ok` (SIN-563), der alte Lauf blockiert den Beleg nicht.
- Annahmen: Der Beleg „kein Lauf über 20 €" braucht einen echten Live-Lauf (content-grow, dann `run-task cost-report`) mit Secrets; im Agentenlauf nicht möglich. `docs/product-readiness.json` bleibt unverändert, ein Beleg ohne Messung wäre erfunden.
- Warum: Ein zweites Gate neben `partGate` wäre doppelte Logik.
