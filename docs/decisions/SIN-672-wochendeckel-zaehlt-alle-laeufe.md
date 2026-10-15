# SIN-672: Wochendeckel zählt alle Ledger-Läufe

- Links: https://linear.app/sinan-kahraman/issue/SIN-672, `docs/decisions/SIN-661-wochendeckel-vor-start.md`, `docs/decisions/SIN-645-wochenkosten-unter-40.md`, `docs/decisions/SIN-534-kosten-woche.md`
- Ursache: `runAllowed` summierte nur die Lauf-Berichte der Fabrik (`docs/ops/content-runs/*.json`). Die Kennzahl `kosten_woche` summiert dagegen alle Zeilen von `pipeline_run_costs`, also auch `judge-backfill`, `goldset-regression` und Reparatur-Läufe außerhalb der Fabrik. Diese Kosten fehlten im Deckel, darum 40,55 € in 28 Läufen trotz Deckel 40 €. Die Prüfung je Teilbatch (`partGate`) kannte nur den Lauf-Deckel (20 €), nie die Woche.
- Entscheidung: Eine gemeinsame Summe `weekCost` (`scripts/autonomy/week-cost.mjs`) für die Kennzahl und die Fabrik. `runAllowed` nimmt das Maximum aus Berichten und Ledger-Summe. `partGate` prüft zusätzlich Wochenkosten vor dem Lauf + erwartete Laufkosten ≤ 40 €, vor jedem Teilbatch. Unit-Test: knapp unter dem Deckel startet kein Teilbatch, der ihn überschreiten würde.
- Annahmen:
  - Das Ledger liefert die letzten 100 Zeilen (wie die Kennzahl); reicht für 7 Tage, solange keine über 100 Läufe pro Woche laufen.
  - Läufe, die schon im Ledger stehen und im Bericht (Maximum statt Summe), werden nicht doppelt gezählt.
  - Die Lauf-eigenen Kosten kommen erst am Ende ins Ledger, daher keine Doppelzählung im Teilbatch.
- Warum: Kleinste Änderung, die Kennzahl und Deckel auf denselben Wert bringt.
