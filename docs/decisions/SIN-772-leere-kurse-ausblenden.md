# SIN-772: Leere Platzhalter-Kurse ausblenden

- Links: Issue SIN-772, Fertig-Liste `docs/FERTIG.md` (SIN-764)
- Entscheidung: `MAPS_MIT_INHALT` in `src/lib/learner/onboarding.ts` nennt die Maps mit veröffentlichten Einheiten (jetzt nur `maf-metall`). Die Schwerpunkt-Auswahl nutzt `verfuegbareSchwerpunkte()`. Eine Map kommt in die Liste, wenn sie Inhalte hat.
- Annahmen: Die Startseite und der Lernpfad zeigen keine Kursliste, nur die Schwerpunkt-Auswahl führt zu Kursen. Das Demo-Formular für Ausbilder (Interesse am Schwerpunkt) bleibt unverändert, es wählt keinen Kurs. „Kunststoffbetrieb“ ist leer und fällt weg, daher entfällt die Betriebsauswahl.
- Warum: Kleinste Lösung ohne Datenbankabfrage; die Liste ist ein Test-gesicherter Schalter.
