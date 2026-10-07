# SIN-347: Fehlende Tabellen anwenden und belegen

- Linear: https://linear.app/sinan-kahraman/issue/SIN-347
- Vorarbeit: `docs/decisions/SIN-268-kostenmessung.md`, `SIN-280-kosten-pro-lauf.md`, `SIN-289-sentry-fabrik-status.md`

## Entscheidung

Kein neues Werkzeug. Die Aufgabe `migrate` in `run-task.yml` (Sicherung, dann nur additive Migrationen) bleibt der Weg. Neu: Nach dem Anwenden prüft sie per Abfrage auf `information_schema`, dass `pipeline_run_costs` (`20261006020000_sin268_repair_run_costs.sql`) und `content_factory_runs` (`20261007020000_sin289_content_factory_runs.sql`) existieren, schreibt je Tabelle `ok`/`FEHLT` ins Log (nur Namen) und wird rot, wenn eine fehlt. `scripts/verify-supabase-schema.mjs` prüft `content_factory_runs` jetzt mit.

## Annahmen

- Die Secrets `SUPABASE_ACCESS_TOKEN` und `SUPABASE_PROJECT_REF` sind gesetzt. Fehlen sie, meldet `migrate` den Blocker mit den Namen (Exit 3), und der Planer legt die Sinan-Aufgabe dafür an (`SEED` in `sinan.mjs`).
- Der Worker läuft ohne Secrets und hat `migrate` nicht live ausgeführt. Deshalb ändert `docs/product-readiness.json` nichts: „Kosten pro Kurslauf gemessen“ und „Content-Fabrik läuft“ brauchen echte Läufe (`content-grow`, `cost-report`) nach der Migration.

## Warum

Die Tabellen fehlen, weil bisher kein Lauf mit echten Secrets die Migration angewendet hat. Der Beleg im Log macht „angewendet“ prüfbar, ohne Werte oder Secrets.
