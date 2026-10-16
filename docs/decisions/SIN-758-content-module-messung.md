# SIN-758: Produktreife „Alle Module veröffentlicht“ aus Supabase messen

- Links: `scripts/autonomy/readiness.mjs` (`openModules`), `scripts/autonomy/content-metrics.mjs` (`computeCoverage`, `passRateByModule`), Linear SIN-758
- Entscheidung: `content-module` ist eine automatische Prüfung. Ein Modul von MAF Metall gilt als veröffentlicht, wenn Ist ≥ Soll (Curriculum-Map) und die Bestehensquote des Moduls ≥ Goldset-Ziel (`goldsetTarget`, Standard 90 %). Der Beleg listet die offenen Module mit Grund.
- Annahmen: Quote-Ziel ist dasselbe wie bei `content-quote` (kein zweiter Schwellenwert). Ein Modul ohne Bewertung gilt als offen. Ohne Supabase-Zugang (oder bei Fehler) bleibt der Status „nicht verfügbar“; die manuelle Bestätigung in `docs/product-readiness.json` greift für diesen Punkt nicht mehr.
- Warum: Die Daten (`collectContentMetrics`) gibt es schon; keine neue Abfrage, keine neue Umgebungsvariable.
