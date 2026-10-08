# SIN-395: Verworfene Fragen nie ausspielen, Verwerfungsgründe im Kennzahlen-Bericht

**Links:** [SIN-395](https://linear.app/sinan-kahraman/issue/SIN-395), Vorarbeit [SIN-394](SIN-394-fragen-bewertet.md), Bewertungstabelle `question_evaluations` (AP-19).

**Entscheidung:**
- Eine Frage gilt als verworfen, wenn ihre letzte Bewertung (`latestPerQuestion`, entspricht der Sicht `question_quality_latest`) nicht bestanden ist. Sie wird an einer zentralen Stelle (`src/lib/learner/discarded.ts`, `dropDiscardedQuestions`) aus den Einheiten entfernt, bevor Lernpfad, Einheit, Wiederholung und Prüfung sie sehen. Einheiten ohne verbleibende Frage entfallen.
- Angewendet an allen drei Ausgabestellen: `loadPathUnitsServer` (Lernpfad-Seite), `/api/learner/phase-a` (Client-Cache für Einheit, Wiederholung, Prüfung) und `loadCoursePath` (Kurs-Lernpfad inkl. geteilter Module aus dem Quellkurs).
- Kennzahlen-Bericht (Planer-Abschnitt „Content“) nennt Verwerfungsgründe je Modul und Fragetyp, häufigste Gruppe zuerst. Gründe stammen aus den strukturierten Wertungen (Quellentreue, Eindeutigkeit, Niveau < 4, Sprache < 4), nicht aus Freitext.

**Annahmen:**
- Fragen ohne Bewertung bleiben sichtbar (der Bewertungslauf holt sie nach, `npm run quality:judge-backfill`); sonst wäre der Pfad bis dahin leer.
- Wird eine Frage nach der Bewertung geändert, gilt weiter die letzte Bewertung. Erst eine neue bestandene Bewertung bringt sie zurück (append-only, SIN-216).
- Kann die Bewertung nicht gelesen werden, fällt die Auslieferung auf den Seed zurück (bestehendes Verhalten im Lernpfad) bzw. die API meldet `source: "error"`. Das Fehlerverhalten wurde nicht verändert.
- Die Zahl 131 stammt aus dem Bericht; sie wird hier nicht festgeschrieben.

**Warum:** Eine zentrale Filterstelle vor allen Lernwegen ist einfacher und sicherer als Filter in jeder Ansicht. Die Auswertung nach Modul und Fragetyp zeigt der Content-Fabrik und der Prompt-Verbesserung (Bestehensquote unter 70 %), wo anzusetzen ist. Keine Personendaten, keine neuen Inhalte.
