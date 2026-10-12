# SIN-458: Migrationen 13/15 – SIN-415 wartet auf Sinan, SIN-416 hängt daran

- Links: SIN-458, SIN-374 (`migrate.yml`), SIN-441, SIN-443, SIN-451 (`docs/decisions/SIN-451-migrationen-abweichung-melden.md`), `supabase/migrations/20261013010000_sin415_mehrere_gruppen.sql`, `supabase/migrations/20261014010000_sin416_admin_organisationen.sql`
- Entscheidung: Keine Änderung an den Migrationen und kein eigenes Anwenden.
  - `20261013010000_sin415_mehrere_gruppen.sql` enthält `alter table public.trainer_groups drop constraint if exists trainer_groups_trainer_id_key;`. `isAdditive` lässt sie deshalb absichtlich liegen (AGENTS.md: Datenbank-Löschungen anfassen verboten, `risk:high`).
  - `20261014010000_sin416_admin_organisationen.sql` ist additiv, ändert aber `public.organisations`, die erst SIN-415 anlegt. Sie schlägt fehl, solange SIN-415 fehlt.
  - Beide Dateien sind damit ein einziger Blocker, der nur Sinan lösen kann: SIN-415 im SQL-Editor ausführen, danach `migrate` (workflow_dispatch) neu starten, damit SIN-416 folgt. Erwartet: 15/15.
- Annahmen:
  - Secrets und Sicherung sind nicht die Ursache; das Verhalten passt zu SIN-441/443. Der Lauf von `migrate.yml` war in dieser Umgebung nicht lesbar (kein `gh`-Zugriff).
  - Das Entfernen der Eindeutigkeit auf `trainer_id` ist gewollt (ein Trainer, mehrere Gruppen, SIN-415) und verliert keine Daten.
  - Das Linear-Issue mit Label `sinan` konnte hier nicht angelegt werden (Befehl nicht freigegeben). Der Wächter legt es beim nächsten Lauf an, wenn nur nicht additive Dateien fehlen; hier fehlt zusätzlich SIN-416, daher bleibt es bis dahin bei diesem Bug-Issue.

## Warum

Eine nicht additive Migration darf kein Agent anwenden. Umschreiben würde die Entscheidung von Sinan umgehen und gegen „nur hinzufügen“ verstoßen.
