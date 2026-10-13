# SIN-563: Kosten pro Kurslauf unter dem Deckel belegen

- Links: https://linear.app/sinan-kahraman/issue/SIN-563, `docs/decisions/SIN-493-teilbatches-kostenpruefung.md`, `docs/decisions/SIN-478-kostendeckel-lauf.md`, `scripts/autonomy/run-task.mjs` (`costResult`), `docs/quality/runs/cost-report-*.json`
- Entscheidung:
  1. **Prüfung geprüft, nicht neu gebaut**: `partGate` rechnet bisherige Summe (inkl. Reparatur) + Teil × Kosten je Einheit × 1,25 + Richter-Reserve für alle erzeugten Einheiten. Neuer Test (`content-grow.test.ts`) simuliert 500 Einheiten mit Ist-Kosten bis +80 % über Plan: der Lauf stoppt, Summe + Richter bleibt ≤ 20 €. Keine Lücke bei Richter-Kosten gefunden (Reserve steckt im Gate). Laufende Batches zählen erst nach dem Einsammeln, begrenzt durch die Teilgröße (100 Einheiten).
  2. **Kostenbericht**: `cost-report` weist die Wochenkosten (7 Tage, Wochendeckel 60 €) als `wocheEur` aus und bewertet `ok` nur über Läufe seit dem Stichtag `TEILBATCH_SEIT` (2026-10-13). Der Lauf vom 12.10. (21,78 €) bleibt sichtbar, blockiert aber nicht mehr.
- Annahmen:
  - Stichtag 2026-10-13 = Merge von SIN-493 (Squash-Commit, Datum aus Git).
  - Ohne Lauf seit dem Stichtag bleibt `ok` null. `docs/product-readiness.json` wird nicht geändert: dieser Worker startet keinen Live-Lauf (API-Kosten, Secrets). Das Akzeptanzkriterium „nächster echter Lauf unter 20 €“ ist offen; `run-task cost-report` nach dem nächsten content-grow-Lauf schreibt den Beleg und setzt den Punkt.
  - Ein Ausreißer innerhalb eines einzelnen Teils (100 Einheiten, ca. 6 €) bleibt möglich und ist durch Faktor 1,25 plus Reserve gedeckt.
- Warum: Der Deckel wird vor jedem Teil geprüft; der Bericht soll nur Läufe unter dem neuen Mechanismus bewerten und die Wochenkosten zeigen.
