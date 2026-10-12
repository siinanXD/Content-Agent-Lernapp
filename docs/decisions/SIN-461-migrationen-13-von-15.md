# SIN-461: Migrationen 13/15 – weitere Dublette von SIN-458

- Links: SIN-461, SIN-460, SIN-458 (`docs/decisions/SIN-458-migrationen-415-416.md`), SIN-451, SIN-374
- Entscheidung: Keine Änderung an den Migrationen, kein eigenes Anwenden. Gleiche Lage wie SIN-458/SIN-460.
  - `20261013010000_sin415_mehrere_gruppen.sql` enthält `drop constraint`; nur Sinan führt sie aus.
  - `20261014010000_sin416_admin_organisationen.sql` braucht `public.organisations` aus SIN-415 und scheitert, bis SIN-415 läuft.
  - Nächster Schritt (Sinan): SIN-415 im SQL-Editor ausführen, dann `migrate` per workflow_dispatch neu starten. Erwartet: 15/15.
- Annahmen: Secrets und Sicherung sind nicht die Ursache. Der Lauf von `migrate.yml` ist hier nicht lesbar. Keine neue Lehre nötig, steht in LEHREN.md (SIN-451).

## Warum

Eine nicht additive Migration darf kein Agent anwenden. SIN-461 kann zusammen mit SIN-458 und SIN-460 geschlossen werden, sobald 15/15 erreicht ist.
