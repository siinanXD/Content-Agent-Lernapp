# Rechteprüfung (SIN-438)

Migration `20261029010000_sin438_remaining_table_grants.sql` verändert nur
Tabellenprivilegien und die Tabellenvorgaben des Erstellers `postgres`.
Bestehende Lese-/DML-Rechte, RLS, RPCs und Service-Role bleiben erhalten.
Die Reihenfolge liegt hinter dem bisherigen neuesten Migrationseintrag;
die Datei wurde mit `supabase migration new` erstellt und vor dem ersten Commit eingeordnet.

## Prüfung

```sh
psql "$STAGING_DB_URL" -X -v ON_ERROR_STOP=1 -f scripts/verify-sin438-migration.sql
psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f scripts/verify-table-grants.sql
```

Der erste Test führt die Migration zweimal aus, prüft alle public-Tabellen,
vergleicht bestehende DML-Rechte und RLS und legt eine leere Tabelle für den
Default-ACL-Test an. Danach prüft er die wiederhergestellten ACLs und rollt
die gesamte Transaktion zurück. Keine Anwendungszeilen werden geschrieben.
Der zweite Befehl ist die bleibende lesende Nachkontrolle nach Deployment.

## Auslieferung und Rückkehr

Deployment erst nach unabhängigem Review, erforderlicher Owner-Freigabe,
grüner CI und aktuellem Backup-/Wiederherstellungsnachweis. Die bestehenden
Migrationen werden nicht geändert. Nach Deployment Gruppenanlage und Einladung
prüfen; ein Katalogtest allein ist keine vollständige Live-Abnahme.

Vor einer Anwendung die aktuellen `pg_class.relacl`- und
`pg_default_acl`-Einträge privat sichern. Bei einem Fehler vor Commit die
Transaktion zurückrollen. Nach Commit nur die tatsächlich benötigten zuvor
gesicherten Privilegien als separate, geprüfte Vorwärtsmigration wiederherstellen;
kein pauschales `GRANT ALL`. Die vorhandenen SQL-Integrationstests belegen den
transaktionalen Rollback, nicht eine Produktionswiederherstellung aus Backup.

Managed-Owner-Vorgaben (`supabase_admin`) und Rechte außerhalb von public
bleiben eine separate Abnahme. Der Tabellencheck behauptet kein globales
Read-only für eine Datenbankrolle.
