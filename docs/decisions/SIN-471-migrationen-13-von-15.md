# SIN-471: Migrationen 13/15 – Dublette von SIN-470

- Links: SIN-471, SIN-470 (`docs/decisions/SIN-470-migrationen-13-von-15.md`), SIN-458 (`docs/decisions/SIN-458-migrationen-415-416.md`), SIN-468 (`docs/decisions/SIN-468-migrations-dubletten.md`), SIN-374
- Entscheidung: Keine Änderung an den Migrationen, kein eigenes Anwenden. Gleiche Lage wie SIN-470 und SIN-458.
  - `20261013010000_sin415_mehrere_gruppen.sql` enthält `drop constraint` und ist nicht additiv; nur Sinan führt sie aus.
  - `20261014010000_sin416_admin_organisationen.sql` braucht `public.organisations` aus SIN-415 und scheitert, bis SIN-415 läuft.
  - Nächster Schritt (Sinan): SIN-415 im SQL-Editor ausführen, dann `migrate` per workflow_dispatch neu starten. Erwartet: 15/15.
- Annahmen: Secrets und Sicherung sind nicht die Ursache. Der Lauf von `migrate.yml` ist hier nicht lesbar.

## Warum

Eine nicht additive Migration darf kein Agent anwenden. SIN-471 kann zusammen mit SIN-470 und SIN-458 geschlossen werden, sobald 15/15 erreicht ist.
