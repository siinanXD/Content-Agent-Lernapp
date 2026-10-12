# SIN-470: Migrationen 13/15 – Dublette von SIN-458

- Links: SIN-470, SIN-458 (`docs/decisions/SIN-458-migrationen-415-416.md`), SIN-468 (`docs/decisions/SIN-468-migrations-dubletten.md`), SIN-441, SIN-443, SIN-451, SIN-374
- Entscheidung: Keine Änderung an den Migrationen, kein eigenes Anwenden. Gleiche Lage wie SIN-458 und SIN-460 bis SIN-467.
  - `20261013010000_sin415_mehrere_gruppen.sql` enthält `drop constraint` und ist nicht additiv; nur Sinan führt sie aus.
  - `20261014010000_sin416_admin_organisationen.sql` braucht `public.organisations` aus SIN-415 und scheitert, bis SIN-415 läuft.
  - Nächster Schritt (Sinan): SIN-415 im SQL-Editor ausführen, dann `migrate` per workflow_dispatch neu starten. Erwartet: 15/15.
- Annahmen: Secrets und Sicherung sind nicht die Ursache. Der Lauf von `migrate.yml` ist hier nicht lesbar. Keine neue Lehre nötig (die Dublettenvermeidung kam mit SIN-468).

## Warum

Eine nicht additive Migration darf kein Agent anwenden. SIN-470 kann zusammen mit SIN-458 und den übrigen Dubletten geschlossen werden, sobald 15/15 erreicht ist.
