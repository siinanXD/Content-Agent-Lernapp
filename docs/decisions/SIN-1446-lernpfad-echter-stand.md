# SIN-1446 — Lernpfad: Stand aus Lernereignissen

- Links: [SIN-1446](https://linear.app/sinan-kahraman/issue/SIN-1446)
- Entscheidung: `mapGeneratedToPathUnits` und der Seed setzen jede Einheit auf „offen“. Der Stand entsteht im Lernpfad aus den Lernereignissen (`withProgress` in `src/lib/learner/path-progress.ts`): erledigt ist nur, wozu es ein Ereignis `unit` mit `unitId` gibt; die erste nicht erledigte Einheit ist „Jetzt“. Das Tagesziel kommt weiter aus `computeDailyGoal`, nicht aus der Position.
- Annahmen: Lernereignisse liegen bisher nur lokal im Browser (`cal-learn-events`), also gilt der Stand je Gerät. Ein Konto-Abgleich über Geräte hinweg braucht eine Server-Tabelle und ist ein eigener Auftrag. Ältere Ereignisse ohne `unitId` erledigen nichts (ehrlicher als raten). `?demo=1` markiert die ersten zwei Einheiten als erledigt (erfunden, nichts gespeichert).
- Warum: Kürzester Weg, der ohne neues Schema auskommt und das Fehlverhalten (Positions-Haken) beseitigt.
