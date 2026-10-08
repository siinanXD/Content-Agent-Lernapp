# SIN-396: Test-UUID für Live-Check und Validierung

**Links:** [GitHub Issue SIN-396](https://linear.app/sinan-kahraman/issue/SIN-396)

## Entscheidung

Der Live-Check verwendet eine feste, gültige Test-UUID (`f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0`) statt der dynamischen Kennung `livecheck-<Zeit>`. Die Progress-Route validiert UUIDs und lehnt ungültige Kennungen mit 400 `anonymousId_invalid` ab, nicht mit 500.

## Begründung

Die bisherige Test-Kennung `livecheck-<Zeit>` ist keine gültige UUID, wird aber in die Spalte `learning_progress.anonymous_id` geschrieben, die vom Typ `uuid not null` ist. Mit Mock-Speicher (lokal, CI) funktioniert das, weil der Mock keine Typprüfung macht. In Production mit Supabase wird die Kennung abgelehnt und der Live-Check schlägt fehl, was zu unwollten Reverts führt.

Eine feste Test-UUID ermöglicht:
- Production schreibt echte Daten (keine Entspannung für Tests)
- Die Test-Zeilen sind filterbar: `WHERE anonymous_id = 'f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0'`
- Validation verhindert andere Fehler dieser Art früh (400 statt 500)

## Annahmen

- Die Test-UUID `f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0` ist nicht in echten Daten zu erwarten (die App erzeugt UUIDs zufällig, nicht mit diesem Pattern)
- UUID-Validierung mit Regex ist ausreichend (kein Bedarf für UUID-Bibliotheken)
- Bestehende Test-Daten mit `livecheck-*` Kennungen bleiben in der Datenbank und werden nicht gelöscht
