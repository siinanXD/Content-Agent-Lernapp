# SIN-645: Wochenkosten unter 40 €, Einzellauf unter 20 €

- Links: https://linear.app/sinan-kahraman/issue/SIN-645, `docs/decisions/SIN-595-wochenkosten-beleg-offen.md`, `docs/decisions/SIN-534-kosten-woche.md`, `docs/decisions/SIN-469-fabrik-laeufe-pro-woche.md`, `docs/ops/content-runs/2026-10-12T09-44-47-533Z.json`, `docs/ops/content-runs/2026-10-14T10-39-21-371Z.json`
- Entscheidung: `WEEK_CAP_EUR` von 60 auf 40 €. `runAllowed` startet einen Lauf nur, wenn Wochenkosten + Lauf-Deckel (20 €) ≤ 40 € bleiben. Damit ist die Wochensumme hart begrenzt (bei Läufen um 15 € gibt es zwei Läufe je 7 Tage statt drei). Kein Umbau der Fabrik.
- Ursache mit Zahlen (aus den Berichten im Repo):
  - Lauf 12.10. (Sonnet, ein einziger Batch, vor den Teilbatches): 21,78 € für 318 erzeugte Einheiten (0,068 €/Einheit), davon Reparatur 2,90 €; 62 verworfen (19 %), Stopp „Deckel erreicht“. Ein Batch ist erst nach dem Absenden messbar; seitdem verhindert `partGate` das (SIN-493, Teilbatches).
  - Lauf 14.10. (Haiku, 5 Teilbatches): 14,89 € für 206 erzeugte Einheiten (0,072 €/Einheit), davon Reparatur 2,54 €; 71 verworfen (34 %, gut ein Drittel der Ausgabe ohne Ertrag); 7 von 110 Teilaufträgen ohne lesbare Antwort, 6 davon APPT-1 (dessen Einheiten komplett verworfen). Einzellauf unter 20 €.
  - Wochenkosten 40,49 € (Warnung): Der Code erlaubte bis 60 € je 7 Tage, das Ziel ist 40 €. Das war der Engpass: Wochendeckel und Ziel passten nicht zusammen.
- Annahmen:
  - Der Agent hat keinen Zugriff auf das Ledger (`pipeline_run_costs`) und startet keinen Live-Lauf; Kosten je Teilbatch stehen nur summiert im Bericht. Die Zahlen sind die der Berichte.
  - `docs/product-readiness.json` bleibt unverändert: Der Beleg „Wochenkosten unter 40 € im nächsten Messzeitraum“ braucht einen Lauf nach dem Merge (`run-task cost-report`, Lauf-URL und `wocheEur` eintragen). Ein Eintrag vorab wäre erfunden; die Lauf-URL des 14.10. ist im Repo nicht belegt.
  - Offen, nicht in diesem PR: Verwerfungsquote 34 % und leere Haiku-Antworten bei APPT. Bleibt die Quote hoch, ein eigenes Issue.
- Warum: Kleinste Änderung, die das Ziel garantiert, statt Verwerfungsquoten ohne Messdaten zu raten.
