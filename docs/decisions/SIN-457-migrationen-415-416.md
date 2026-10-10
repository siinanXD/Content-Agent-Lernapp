# SIN-457: Migrationen 415/416 fehlen in Supabase

- Links: SIN-457, SIN-374 (`migrate.yml`), `scripts/autonomy/run-task.mjs` (`isAdditive`)
- Entscheidung: Keine Code- und keine Migrationsänderung. Die Migration `20261013010000_sin415_mehrere_gruppen.sql` bleibt unverändert und wird von Sinan freigegeben und von Hand angewendet.
- Ursache: Die 415-Migration enthält `alter table … drop constraint if exists trainer_groups_trainer_id_key`. `isAdditive` wertet das als Datenverlust, `migrate` lässt sie liegen und der Lauf bleibt rot. `20261014010000_sin416_admin_organisationen.sql` ändert `organisations`, die erst 415 anlegt. Sie hängt an 415 und kann nicht allein laufen.
- Bewertung: Das `drop constraint` hebt nur die Eindeutigkeit auf (ein Ausbilder darf mehrere Gruppen haben). Es löscht keine Daten und ist inhaltlich unkritisch. Nach AGENTS.md entscheidet bei nicht additiven Migrationen trotzdem Sinan.

## Annahmen

- Geändert wird keine bestehende Migration (wäre `risk:high`, Datenverlust-Regel).
- Secrets und Sicherung wurden nicht geprüft: Der Agent hat keinen Zugriff auf Actions-Läufe oder Secrets. Die Ursache ergibt sich schon aus dem Inhalt der Datei.
- Das `sinan`-Issue konnte der Agent nicht anlegen (Befehl nicht freigegeben). Die Schritte stehen im PR.

## Warum

Die Regeln „nur additiv automatisch" und „Freigabe durch Sinan" bleiben unangetastet. Den Filter zu lockern, um einen Wächter-Fehler zu beheben, würde die Schutzfunktion aufweichen.
