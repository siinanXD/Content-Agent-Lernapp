# SIN-850: Migration 20261026010000_sin832 fehlt in Supabase (25/26)

- Issue: https://linear.app/sinan-kahraman/issue/SIN-850
- Befund: Die Datei ist additiv (nur `alter table … add column if not exists`, `isAdditive` in `scripts/autonomy/run-task.mjs` lässt sie durch). Die Zieltabelle `leitstand_aufgaben` wird durch SIN-848 (angewendet, sonst stünde der Stand bei 24/26) bereits ergänzt. Eine Ursache im Repo gibt es nicht.
- Entscheidung: Keine Codeänderung. Die Migration wird von `migrate.yml` angewendet, sobald der Lauf (push auf `supabase/migrations/**` oder `workflow_dispatch`) grün durchläuft.
- Annahme: Der Lauf nach dem Merge von SIN-832 ist nicht oder an Secrets/Sicherung gescheitert; der Agent hat keinen Zugriff auf Actions-Läufe und Secrets und konnte das nicht prüfen.
- Warum: Migrationen werden nie von Hand angewendet und Dateien nie umgeschrieben (LEHREN SIN-441).
