# SIN-460: Migrationen 13/15 – Dublette von SIN-458

- Links: SIN-460, SIN-458 (`docs/decisions/SIN-458-migrationen-13-von-15.md`), SIN-441, SIN-443, SIN-451, SIN-374
- Entscheidung: Keine Änderung an den Migrationen, kein eigenes Anwenden. Gleiche Lage wie SIN-458.
  - `20261013010000_sin415_mehrere_gruppen.sql` enthält `drop constraint` und bleibt absichtlich liegen (nur Sinan).
  - `20261014010000_sin416_admin_organisationen.sql` braucht `public.organisations` aus SIN-415 und scheitert, bis SIN-415 läuft.
  - Nächster Schritt liegt bei Sinan: SIN-415 im SQL-Editor ausführen, dann `migrate` (workflow_dispatch) neu starten. Erwartet: 15/15.
- Annahmen: Secrets und Sicherung sind nicht die Ursache (wie SIN-441/443). Der Lauf von `migrate.yml` ist hier nicht lesbar.

## Warum

Eine nicht additive Migration darf kein Agent anwenden. Ein weiteres Bug-Issue ändert daran nichts; SIN-460 kann zusammen mit SIN-458 geschlossen werden, sobald 15/15 erreicht ist.
