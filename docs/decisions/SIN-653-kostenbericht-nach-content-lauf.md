# SIN-653: Kostenbericht nach jedem content-grow-Lauf, Structured Outputs live belegen

- Links: https://linear.app/sinan-kahraman/issue/SIN-653, `docs/decisions/SIN-588-kosten-beleg-offen.md`, `.github/workflows/content-grow.yml`, `scripts/autonomy/run-task.mjs` (`--kosten-zeile`), `src/lib/generate/content-grow.ts` (`linearSummary`)
- Entscheidung: Der Workflow `content-grow` hängt als letzten Schritt (`if: always()`, nicht im Trockenlauf) eine Kostenzeile aus dem Ledger an `content-run-summary.md`. Die Datei geht in den Linear-Kommentar und den Bericht-PR; das Tages-Update zeigt weiter die Wochenkosten. Die Zusammenfassung nennt nun den Anteil schema-gültiger Fragen und die Verwerfungsquote.
- Annahmen:
  - Der Kostenbericht liest nur das Ledger (kein Claude-Aufruf, keine Kosten) und bricht den Lauf nie ab; bei Fehler steht „nicht verfügbar“.
  - Der Live-Beleg für Structured Outputs entsteht erst im nächsten echten Lauf (Sandbox ohne Key). „Vorher“-Wert: Reparatur 67 % am 08.10.; eine Verwerfungsquote vorher ist nicht erfasst.
  - Wochendeckel 40 € (SIN-645) bleibt unverändert.
- Warum: Der Beleg kommt so ohne Handarbeit mit jedem Lauf.
