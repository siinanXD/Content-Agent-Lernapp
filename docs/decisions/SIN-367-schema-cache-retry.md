# SIN-367: Kennzahlen-Bericht wiederholt Schema-Cache-Fehler

- Linear: https://linear.app/sinan-kahraman/issue/SIN-367
- Vorarbeit: `docs/decisions/SIN-359-tabellenfehler-klassen.md`, `SIN-351-schema-cache-neu-laden.md`

## Entscheidung

Die Kennzahlen `content_fabrik` und `kosten_pro_lauf` wiederholen die Abfrage genau einmal nach einem Schema-Cache-Fehler (PGRST205). Der Fehler ist oft transient, weil PostgREST den Cache gerade neu lädt. Nach der Wiederholung ist kein weiterer Versuch nötig — die Ursache ist dann ein echter Fehler (Migration fehlt, Zugriff verweigert).

Mechanik: neuer Helper `isSchemaCache(error)` in `table-error.mjs`, Retry in `fabrik.mjs` und `planner.mjs`. Die Fehlermeldung bleibt unverändert und nennt weiterhin Tabelle und Migration.

## Annahmen

- PostgREST-Fehler mit „schema cache" im Text sind vorübergehend und einzelne Wiederholung behebt sie. Mehrfach-Retries (wie in `fetchJson`) sind nicht nötig.
- Die Abfrage-URLs sind idempotent und können ohne Nebenwirkung wiederholt werden.

## Warum

Schema-Cache-Fehler treten auf, wenn die Migration gerade angewendet wurde, PostgREST den Cache aber noch nicht neu geladen hat. Eine einzelne Wiederholung mit kurzem Warten behebt das Problem, ohne dass Sinan eingreifen muss.
