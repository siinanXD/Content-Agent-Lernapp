# SIN-351: Kennzahlen melden trotz SIN-347 „Tabelle fehlt“

- Linear: https://linear.app/sinan-kahraman/issue/SIN-351
- Vorarbeit: `docs/decisions/SIN-347-fehlende-tabellen-anwenden.md`
- Doku: https://postgrest.org/en/stable/references/schema_cache.html

## Entscheidung

Die Kennzahlen deuten jeden HTTP-404 der REST-Schnittstelle als „Tabelle fehlt“. PostgREST antwortet aber auch mit 404, wenn die Tabelle existiert, der Schema-Cache sie jedoch nicht kennt. `20261007020000_sin289_content_factory_runs.sql` hatte im Gegensatz zu `20261006020000` kein `notify pgrst, 'reload schema'`. Behoben mit: neuer Migration `20261008010000_sin351_reload_schema_cache.sql` (nur Neuladen) und `migrate` in `run-task.mjs`, das nach jedem Lauf den Cache neu lädt (auch wenn nichts anzuwenden war).

## Annahmen

- Der Worker hat keine Supabase-Secrets und konnte das Projekt nicht abfragen. Die Ursache ist deshalb aus dem Code abgeleitet, nicht live bestätigt. Bleibt die Kennzahl nach `run-task migrate` weiter rot, ist die Migration nie gelaufen (Secrets `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF`) oder `SUPABASE_URL` zeigt auf ein anderes Projekt; die Ausgabe `ok`/`FEHLT` je Tabelle im Log zeigt das.
- `docs/product-readiness.json` bleibt unverändert: Ein Lauf der Content-Fabrik ist nicht belegt, und ohne echten Lauf wird kein Beleg erfunden. Nach `migrate` und `content-grow` trägt der Lauf den Beleg ein.

## Warum

Ein einzeiliges Neuladen ist die kleinste Änderung ohne neue Abhängigkeit und trifft die wahrscheinlichste Ursache.
