# SIN-1449 Prüfung: echte Zeit, echte Fragen

Annahmen: Zeit = Dauer aus dem Katalog × 60 s. Fragen nur aus veröffentlichten Kurseinheiten (`/api/learner/phase-a`), gefiltert nach Prüfungsgebiet, dedupliziert nach Id, höchstens die Soll-Anzahl (PT 30, PP/WiSo 15). Zu wenige oder gar keine Fragen: Hinweis auf der Startseite, kein Auffüllen, ohne Fragen kein Start. Seed-Fragen nur im Beispielmodus (`?demo=1`). Läuft die Zeit ab, endet die Prüfung mit den bisherigen Antworten; nicht beantwortete zählen im Ergebnis als offen (Summe = Fragenzahl).
