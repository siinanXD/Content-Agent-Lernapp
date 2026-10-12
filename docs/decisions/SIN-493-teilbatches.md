# SIN-493: Großen Batch in Teilbatches zerlegen, Kosten nach jedem Teil prüfen

- Links: https://linear.app/sinan-kahraman/issue/SIN-493, `docs/decisions/SIN-478-kostendeckel-lauf.md`, AGENTS.md (Stopp-Regel 20 € je Kurslauf), `scripts/content-grow.ts`, `src/lib/generate/content-grow.ts`
- Entscheidung:
  1. **Teilen** (`splitTargets`): Die geplanten Einheiten gehen in Teilbatches mit höchstens 100 Einheiten (`PART_MAX_UNITS`). Ein Ziel mit 2 Einheiten bleibt ganz.
  2. **Messen**: Nach jedem Teil (inkl. Schema-Reparatur) zählt die gemessene Summe aus dem Ledger. Die Kosten je Einheit für die weiteren Teile sind das Maximum aus Plan und Messung (`measuredPerUnit`), werden also nie optimistischer.
  3. **Prüfen vor jedem Teil** (`partGate`): bisherige Summe (inkl. Reparatur) + Einheiten × Kosten je Einheit × 1,25 + Richter-Reserve für alle bis dahin erzeugten Einheiten ≤ 20 €. Sonst startet der Teil nicht; der Rest zählt als zurückgestellt (`deferred`), `resumeModuleId` zeigt auf das nächste offene Modul, der Grund steht als `stopReason` im Lauf-Bericht.
  4. **Weiter**: Bereits erzeugte Einheiten laufen durch Richter (ein Aufruf am Ende) und Veröffentlichung.
- Annahmen:
  - Ein einzelner Teil mit 100 Einheiten kostet bei 0,059 €/Einheit etwa 6 €. Ein Ausreißer innerhalb des ersten Teils bleibt möglich, ist aber auf diese Größe begrenzt.
  - Teile laufen nacheinander (Absenden, Warten, Einsammeln); die Laufzeit steigt, weil mehrere Batches nacheinander warten. Das Zeitlimit je Batch bleibt unverändert.
  - Die Richter-Reserve nutzt weiter 6 Fragen je Einheit (SIN-478).
- Warum: Die Kosten eines Batches sind erst nach dem Absenden bekannt. Kleinere Teile machen aus der Vorab-Schätzung eine Messung nach jedem Teil, ohne schon erzeugte Einheiten wegzuwerfen.
