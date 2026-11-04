# SIN-1532: Fragetypen-Schreibweisen beim Lesen

- Gemessen (Supabase, MAF): 19 Typnamen außerhalb der fünf, davon kannte `TYPE_ALIASES` sieben (`single_choice`, `fill_blank`, `matching`, `ordering`, `numeric`, `match`, `single`). Neu: `choice`, `choices`, `true_false`, `blank`, `blanks`, `fill_in_blank`, `fill_in_blanks`, `cloze`, `pairs`, `steps`, `numeric_input`.
- Die Tabelle `questions` hat nur `choices` und `correct`. Bei Alias-Typen stehen Paare, Schritte und Lösungslisten in `correct`; `normalizeQuestion` liest sie von dort. Für die fünf Typnamen selbst ändert sich nichts (Annahme: ihre Fragen bleiben bis zu einer eigenen Entscheidung ausgeblendet, siehe PR).
- `true_false` ohne `choices`: Wahr/Falsch; `correct` wird auf die Schreibweise der Auswahl gebracht, jede andere Antwort blendet die Frage aus.
- Mehrere Lösungen ohne `blanks`: nur eindeutig, wenn der Text gleich viele Lücken (`____`) hat, sonst ausgeblendet.
- Nicht abbildbar, bleibt ausgeblendet: `short_answer` (kein Lückentext, keine Rechenaufgabe), `matching`/`pairs` mit `correct` als reine Textliste oder Text, `steps` mit `correct` als ein Text.
- Keine Datenbank-Änderung.
