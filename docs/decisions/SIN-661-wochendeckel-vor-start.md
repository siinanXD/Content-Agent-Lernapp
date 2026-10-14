# SIN-661: Wochendeckel vor Start prüfen, Pause ins Statusprotokoll

- Links: https://linear.app/sinan-kahraman/issue/SIN-661, `docs/decisions/SIN-645-wochenkosten-unter-40.md`, `docs/decisions/SIN-493-teilbatches.md`, `docs/decisions/SIN-595-wochenkosten-beleg-offen.md`
- Entscheidung: Die Prüfung existiert schon (`runAllowed`, SIN-645: Wochenkosten + Lauf-Deckel 20 € ≤ 40 €; `partGate`, SIN-493, innerhalb des Lauf-Deckels). Weil der Lauf nie über 20 € kommt, ist die Woche damit hart auf 40 € begrenzt; eine zweite Wochenprüfung je Teilbatch wäre doppelt. Neu: Der Grund der Pause steht in `GITHUB_STEP_SUMMARY` (Statusprotokoll, Exit 0 = pausiert, nicht rot), plus Unit-Test für Grenzfälle (genau 40 € startet, +1 Cent nicht; Teilbatch gegen Restbudget).
- Annahmen:
  - Als „geschätzte Kosten des Laufs“ gilt der Lauf-Deckel (20 €), die sichere Obergrenze; eine feinere Schätzung würde mehr Läufe erlauben, aber die Obergrenze nicht garantieren.
  - Die 40,55 € der Kennzahl stammen aus der Zeit vor SIN-645 (Wochendeckel 60 €). `docs/product-readiness.json` bleibt unverändert: Der Beleg braucht einen Wochenlauf nach dem Merge (`run-task cost-report`, Lauf-Link eintragen); ohne Messung wäre ein Eintrag erfunden. Das Issue bleibt bis dahin „In Review“.
- Warum: Kleinste Änderung, die das Akzeptanzkriterium sichtbar und getestet macht, statt die Fabrik umzubauen.
