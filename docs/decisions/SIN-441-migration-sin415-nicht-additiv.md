# SIN-441: Migration 20261013010000 bleibt liegen, Sinan entscheidet

- Linear: SIN-441 (Wächter: Migrationen 13/14), SIN-374 (migrate.yml), SIN-415 (Ursprung)
- Code: `isAdditive` in `scripts/autonomy/run-task.mjs`

## Entscheidung

`20261013010000_sin415_mehrere_gruppen.sql` wird nicht von einem Agenten angewendet und nicht umgeschrieben. Die Datei enthält `alter table … drop constraint trainer_groups_trainer_id_key`. Das trifft das Muster für Datenverlust (`alter … drop`), `migrate` stuft sie als nicht additiv ein und lässt sie absichtlich liegen. Das ist kein Fehler der Pipeline. Sinan prüft die Datei und führt sie aus (Sicherung läuft in `migrate.yml` vorher).

## Annahmen

- Die Migration ist inhaltlich unkritisch: Sie lockert nur die Eindeutigkeit von `trainer_groups.trainer_id`, es gehen keine Daten verloren.
- Bestehende Migrationen werden nicht geändert (risk:high). Ein Umschreiben, um das Muster zu umgehen, kommt nicht in Frage.
- Secrets und Sicherung sind nicht die Ursache: 13 von 14 Migrationen wurden angewendet.

## Warum

AGENTS.md: nicht additive Migrationen entscheidet Sinan. Die Aufgabe als Linear-Issue mit Label `sinan` ließ sich in diesem Lauf nicht anlegen (Befehl nicht freigegeben); die Schritte stehen im PR.
