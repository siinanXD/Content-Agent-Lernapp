# SIN-397: Lauf-PR bleibt aus

- Links: `.github/workflows/run-task.yml` (Schritt „Ergebnis als PR“), `scripts/autonomy/run-task.mjs` (`stageResult`)
- Entscheidung: Ursache war `git add docs/quality/runs docs/ops/ap22-runs docs/product-readiness.json 2>/dev/null || true`. `docs/ops/ap22-runs` gibt es nur bei `migrate`; fehlt ein Pfad, bricht `git add` ganz ab und stagt nichts. Der Fehler wurde verschluckt, der Schritt meldete „Keine Änderungen“. Neu: `run-task.mjs --stage` stagt nur vorhandene Pfade und schreibt bei „nichts zu committen“ den Grund in den Lauf-Bericht.
- Annahmen: `main()` schreibt korrekt (Rohdaten, `applyResult`). Das Log war nicht lesbar; die Ursache folgt aus dem Verhalten von `git add` (lokal nachgestellt). Neustart von `cost-report` und `offline-check` erst nach dem Merge.
- Warum: kleinste Änderung ohne neue Abhängigkeit, mit Test.
