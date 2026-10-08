# SIN-359: Kennzahlen-Bericht unterscheidet die Ursache bei fehlenden Tabellen

- Linear: https://linear.app/sinan-kahraman/issue/SIN-359
- Vorarbeit: `docs/decisions/SIN-347-fehlende-tabellen-anwenden.md`, `SIN-289-sentry-fabrik-status.md`
- PostgREST-Fehlercodes: https://docs.postgrest.org/en/stable/references/errors.html

## Entscheidung

Neues Modul `scripts/autonomy/table-error.mjs` ordnet jede fehlgeschlagene Tabellenabfrage einer Klasse zu. Planer (`pipeline_run_costs`) und Fabrik-Status (`content_factory_runs`) nennen sie im Bericht: `nicht messbar [fehlt|Zugriff verweigert|Schema-Cache|unbekannt]: …` mit konkretem nächsten Schritt. `ServiceError` trägt dafür jetzt den Antworttext (`body`, bis 500 Zeichen), damit der PostgREST-Code lesbar ist.

| Klasse | Erkennung |
| --- | --- |
| fehlt | Postgres `42P01`, oder 404 ohne „schema cache“ im Text |
| Zugriff verweigert | HTTP 401/403, `42501`, `PGRST301`/`PGRST302` |
| Schema-Cache | „schema cache“ im Fehlertext (`PGRST205`) |
| unbekannt | alles andere (mit Meldung) |

Zugriff verweigert und Schema-Cache kann nur Sinan beheben (Key setzen, `NOTIFY pgrst, 'reload schema'`). Dann legt der Planer im `--context`-Lauf über `createSinanIssues` ein Issue mit Label `sinan` an (Dubletten per Titel ausgeschlossen). „fehlt“ löst die Aufgabe `migrate` aus, kein Sinan-Issue.

## Annahmen

- PostgREST meldet `PGRST205` sowohl bei fehlender Tabelle als auch bei veraltetem Cache; die Klasse „Schema-Cache“ steht daher für „PostgREST kennt die Tabelle nicht“. Die Sinan-Aufgabe enthält deshalb zuerst die Prüfung mit `to_regclass`.
- Die Fehlerklassen wurden mit Mock-Antworten getestet, nicht gegen die echte Datenbank. Keine Datenbankänderung, keine bestehende Migration angefasst.

## Warum

Trotz SIN-347 und SIN-351 meldete der Bericht jedes 404 als „Tabelle fehlt“. Ohne Ursache wusste niemand, ob Migration, Key oder Cache zu beheben ist.
