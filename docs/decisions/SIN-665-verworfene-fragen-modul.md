# SIN-665: Verworfene Fragen ohne Modulzuordnung

- Issue: https://linear.app/sinan-kahraman/issue/SIN-665
- Code: `scripts/autonomy/content-metrics.mjs` (`discardedByModuleAndType`, `COURSE_KEYWORD_MODULE_MAP`), Test `src/lib/autonomy/content-metrics.test.ts`

## Ursache
`mapOfCourse` kennt nur Kurse mit eigener Map in `docs/content/`. Der Kurs „Industriemechaniker“ (SIN-621) hat keine Map; seine Einheiten haben die Metall-IDs. Seine Bewertungen fielen auf „unbekannt/unbekannt“.

## Entscheidung
Für Kurse ohne Map gilt für die Modulzuordnung die Map aus `COURSE_KEYWORD_MODULE_MAP` (Industriemechaniker → maf-metall). Abdeckung und Bestehensquote bleiben unverändert. Bleibt ein Rest, nennt die Kennzahl die Ursache: „Kurs ohne Map“, „Einheit nicht in Map“, „Fragetyp fehlt“.

## Annahmen
- Die Einheiten-IDs des Industriemechaniker-Kurses liegen in den Modulen der Metall-Map (laut SIN-621 mit gleicher ID kopiert).
- Backfill nicht nötig: Die Zuordnung wird bei jeder Auswertung berechnet, in `question_evaluations` steht kein Modul. Nichts wird geschrieben oder gelöscht.
- Die Zahlen (26/10/8/7) konnte ich ohne Datenbankzugang nicht nachmessen.

## Warum
Kleinste Änderung an der Kennzahl; kein neues Schema, keine Migration.
