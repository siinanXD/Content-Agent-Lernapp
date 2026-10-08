# SIN-406 — Content-Fabrik: Durchsatz je Lauf erhöhen

- **Links:** Linear [SIN-406](https://linear.app/sinan-kahraman/issue/SIN-406), [SIN-220](https://linear.app/sinan-kahraman/issue/SIN-220) (Fabrik), [SIN-378](SIN-378-fabrik-lauf-nachweis.md); Anthropic [Message Batches](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing) (bis 100.000 Anfragen je Batch, alle laufen parallel)
- **Engpass-Analyse** (letzter Lauf `docs/ops/content-runs/2026-10-08T09-08-54-902Z.json`):
  - Erzeugt 20 Einheiten, bestanden 16, verworfen 4 (20 %), Modul ZP, ein Batch.
  - Kosten gesamt 2,43 €, davon Reparatur (AP-21) 1,62 €; Erzeugen und Richter zusammen ca. 0,81 € (≈ 0,04 € je erzeugter Einheit).
  - Genutzt: 2,43 € von 19 € Stopp-Wert, also rund 13 %. Der Deckel war nicht der Engpass.
  - Ursache: `nextOpenItem` wählte genau **ein** Modul je Lauf (hier 20 Einheiten). Mehr als die Größe eines Moduls ging nie, egal wie viel Budget übrig war. Bei 890 Einheiten und ca. 16 je Lauf sind das ~55 Läufe.
  - Zweiter Engpass, kleiner: der Richter bewertete seine Chunks (10 Fragen) nacheinander. Bei mehreren hundert Fragen sind das viele Minuten reine Wartezeit.
  - Modellaufrufe: Erzeugen läuft schon als ein Batch (parallel, 50 % Preis), dort gibt es keine Wartezeit zu holen.
- **Entscheidung:**
  1. `nextOpenItems` (`src/lib/generate/content-grow.ts`) plant so viele Module in Queue-Reihenfolge, wie `affordableUnits` Einheiten hergibt. Alle Chunk-Ziele gehen in **einen** Batch; `trimTargets` schneidet am Deckel ab, das angeschnittene Modul wird `resumeModuleId`.
  2. `liveJudgeWithUsage` bewertet bis zu 4 Chunks gleichzeitig (Reihenfolge der Ergebnisse bleibt).
  3. Bericht bekommt `moduleIds`; Deckel (`RUN_CAP_EUR` 20, `RUN_STOP_EUR` 19, `BUDGET_EUR` 20), `COST_MARGIN` und Schwellen (`QUALITY_THRESHOLDS`, `MIN_PASSED_QUESTIONS`) bleiben unverändert, per Test festgenagelt.
- **Erwartung (Annahme, Nachweis im nächsten Lauf-Bericht):** Bei ≈ 0,04–0,07 € je Einheit (Sicherheitsfaktor 1,25, Reparaturkosten fließen in die Rechnung ein) passen ~200–300 Einheiten unter 19 €, statt 20. Kosten je Einheit bleiben gleich, weil Preis, Modell und Prompts gleich sind. Prompt-Caching greift bei einem großen Batch eher besser.
  - Vergleich vorher/nachher: Felder `generated`, `passed`, `costEur`, `moduleIds` in `docs/ops/content-runs/*.json` und im Statusprotokoll `content_factory_runs`.
- **Annahmen:**
  - Der Richter (OpenAI) verträgt 4 parallele Anfragen; bei Rate-Limit-Fehlern bricht der Lauf wie bisher mit Fehler ab, nichts wird veröffentlicht (Veröffentlichen erst am Ende).
  - Die Verwerfungsquote (20 %) ist Qualitätsschwelle, keine Fehlerquelle; sie wird nicht gesenkt. Verworfenes holt die Reparatur (AP-21) nach.
  - Die Batch-Wartezeit wächst mit der Größe; der Job hat 350 Min. Zeitgrenze, Anthropic schließt Batches meist binnen 1 h ab (Grenze 24 h). Dauert es länger, greift die Zeitgrenze, nichts wird veröffentlicht und der nächste Lauf versucht es erneut.
  - Nicht geändert: wöchentlicher Zeitplan (D-46).
- **Warum:** Das Budget war zu 87 % ungenutzt; die Obergrenze lag in der Planung, nicht im Geld.
