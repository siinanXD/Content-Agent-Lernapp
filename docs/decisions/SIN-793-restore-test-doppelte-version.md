# SIN-793: Restore-Test scheitert an doppelter Migrationsversion

- **Links:** Linear [SIN-793](https://linear.app/sinan-kahraman/issue/SIN-793), Lauf 38959432578, `.github/workflows/restore-test.yml`, [SIN-374](SIN-374-migrationen-automatisch.md), [SIN-337](SIN-337-restore-test-workflow.md)
- **Entscheidung:** Der Workflow verschiebt im Runner-Checkout bei doppelter Version die spätere Datei um 1 (`20261006010000_sin260…` → `20261006010001_…`), bevor `supabase db reset` läuft. Die Dateien im Repo bleiben unverändert.
- **Annahmen:** Ursache ist die Altlast `20261006010000` (sin258 und sin260): die CLI führt die Version als Primärschlüssel in `schema_migrations`. Das Log von Lauf 38959432578 war für den Agenten nicht lesbar (`gh run view` gesperrt), die Ursache ist aus dem Repo geschlossen, nicht im Log belegt. Gibt es einen weiteren Fehler, zeigt ihn der nächste Lauf. `sin268` legt beide Tabellen ohnehin idempotent an, die Reihenfolge ändert nichts.
- **Warum:** Die Dateien umzubenennen ändert bestehende Migrationen (`risk:high`) und würde `migrate`/Wächter in Production durcheinanderbringen. Die Verschiebung nur im Wegwerf-Runner ist risikofrei, Production wird nicht berührt.
