# SIN-1516 Prüfung: echte Fragen und Gebiete nach § 9

Quellen: [MaschFüAusbV § 9](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html), Maps `docs/content/maf-metall.json` und `indkfl.json` (`exam.gradedParts`), `docs/content/DIDAKTIK.md` Abschnitt 6, Figma „W8 Prüfungsergebnis“ (58:369) als Vorlage für das Ergebnis.

Entscheidung: Der Prüfungsaufbau kommt je Kurs aus den freigegebenen Maps (`exam-catalog.ts`, Titel wörtlich, Test gegen die Map). Fragen kommen nur aus dem veröffentlichten Kurs, nur mit Gebiet aus der Zuordnung (SIN-1534), nach Gewicht über die Gebiete verteilt. Lücken stehen mit Zahl auf der Startseite und im Ergebnis. Die Lösung steht erst im Ergebnis.

Annahmen:

- Gewicht eines Gebiets = Einheiten je Gebiet laut Zuordnung (`einheiten`), DIDAKTIK § 6 „nach Einheiten gewichtet“. Jedes Gebiet bekommt mindestens eine Frage, wenn das Soll reicht. Beispiel PP (15 Fragen): PP-a 4, PP-b 3, PP-c 4, PP-d 3, PP-e 1.
- Ein Gebiet mit zu wenigen Fragen wird nicht aus anderen aufgefüllt (SIN-1536); die Prüfung ist dann kürzer, die Zeit bleibt gleich.
- Eine Frage zählt nur im ersten passenden Gebiet des Teils. Fragen ohne Gebiet kommen nicht mehr „zählt mit“ (SIN-1449 Nachtrag entfällt), weil `examAreas` jetzt gesetzt wird.
- Kurse ohne Katalog (Industriemechaniker, andere MAF-Schwerpunkte ohne Tabelle) haben keinen Prüfungsmodus; der Standardkurs ohne Kennung gilt als MAF Metall.
- Offene Aufgaben (`rechnen` mit Musterlösung) werden im Prüfungsmodus gespeichert, nicht gewertet und im Ergebnis mit Musterlösung und Checkliste gezeigt (DIDAKTIK § 6, keine KI-Bewertung, Selbstkontrolle). Die Gesamtzahl im Ergebnis zählt nur gewertete Fragen.
- Ursache der „38 % in jedem Lernfeld“: `scoreByArea` setzte bei leerem Gebiet alle Antworten ein (3 von 8 richtig). Die Prüfungsreife-Kachel im Lernpfad rechnet aus erledigten Einheiten je Modul und blieb unverändert.
- Abweichung vom Frame W8: Überschrift „Nach Prüfungsgebiet“ statt „Nach Lernfeld“ (die Zeilen sind Gebiete nach Verordnung, nicht Lernfelder); Zeile mit Prozent und Balken wie im Frame, darunter eine Zeile mit Anzahl und Ampelwort. Neu ohne Frame: Kachel „Aufbau“ auf der Startseite (gleiche Kachel- und Listenform wie das Ergebnis).
