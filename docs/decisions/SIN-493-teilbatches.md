# SIN-493: Content-Fabrik sendet den Batch in Teilbatches und prüft die Kosten nach jedem Teil

- Links: https://linear.app/sinan-kahraman/issue/SIN-493, `docs/decisions/SIN-478-kostendeckel-lauf.md` (offenes Risiko), `scripts/content-grow.ts`, `src/lib/generate/content-grow.ts` (`splitParts`, `partAllowed`), AGENTS.md (Stopp-Regel 20 € je Kurslauf)
- Entscheidung:
  1. Die geplanten Einheiten gehen in Teilbatches mit höchstens 100 Einheiten (`PART_MAX_UNITS`); ein Chunk-Ziel (2 Einheiten) wird nicht geteilt.
  2. Nach jedem Teil liest der Lauf die gemessenen Kosten (Summe inkl. Reparatur und Schema-Reparatur) und merkt sich den höchsten Wert je Einheit (Plan oder gemessen).
  3. Vor jedem Teil (`partAllowed`): Summe + Einheiten × Kosten je Einheit × 1,25 + Richter-Reserve für alle bis dahin erzeugten Einheiten plus den neuen Teil muss unter 20 € bleiben. Sonst startet der Teil nicht, der Grund steht als `stopReason` im Lauf-Bericht, die nicht gesendeten Einheiten zählen als `deferred` und kommen im nächsten Lauf.
  4. Bereits erzeugte Teile laufen weiter durch Schema-Prüfung, Richter und Veröffentlichung. Das gilt auch, wenn ein späterer Teil ein Zeitlimit oder Ausgabenlimit trifft.
- Annahmen:
  - 100 Einheiten je Teil ist ein Richtwert (rund 5 € bei 0,05 €/Einheit); ein Teil kann den Deckel weiterhin reißen, wenn er allein teurer ist als geplant. Der erste Teil läuft nur mit dem Planwert (teuerster bisheriger Lauf, SIN-478).
  - Teilbatches laufen nacheinander, nicht parallel; der Lauf dauert dadurch länger (jede Batch-Abfrage hat ein eigenes Zeitlimit).
  - Der Richter läuft einmal nach allen Teilen; die Reserve dafür steckt in jeder Prüfung.
- Warum: Kosten eines Batches sind erst nach dem Absenden bekannt. Kleinere Teile begrenzen den Schaden eines teureren Teils auf höchstens einen Teil, ohne bereits Erzeugtes zu verwerfen.
