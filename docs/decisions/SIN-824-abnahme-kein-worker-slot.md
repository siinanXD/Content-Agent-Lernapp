# SIN-824: Abnahme belegt keinen Worker-Platz

Quelle: https://linear.app/sinan-kahraman/issue/SIN-824 samt Kommentar19.10.

Dispatch39235755406/job118004289658 meldet „2 Issues laufen schon(max2)“, obwohl Status39248790721 keinen Worker und acht startbare Aufgaben zeigt. Aktuelle Linear-Zustände: SIN-811 In Progress, SIN-537 In Review. Beide haben type started. pickMany zählt beide, solange waitingIssues sie nicht als wartend erkennt. SIN-537 hat keinen offenen PR im Produktrepo und fiel deshalb durch diesen Filter.

waitingIssues behandelt In Review ohne nachgewiesen aktiven Worker als Abnahmewarten, auch ohne Produkt-PR. Dispatcher, Status/Kick und Snapshot nutzen dieselbe Funktion. Ein tatsächlich aktiver Worker behält seinen Platz. Bei unbekanntem Worker-Stand gibt der Dispatcher keine Slots zusätzlich frei. Kein Issue wird dafür Done oder Todo gesetzt.

Regression zuerst rot: In Review537 plus wartender Freigabe-PR811 blockieren zwei Todos; nach Fix werden beide gewählt. Zusätzliche Gegenprobe: aktiver Worker behält seinen Platz; Status/Kick/Snapshot stimmen überein. Echter Dispatch-/Worker-Nachweis nach unabhängiger Prüfung und regulärem Merge offen.

Ausgelassen: keine Rechte, Secrets, Limits oder Rulesets geändert; keine zusätzliche Steuerungsplattform und keine Wiederaufnahme bereits ausgeschöpfter Reparaturen411/416.

Prüfung: 61 gezielte Tests grün; Typecheck grün; Lint ohne Fehler (2 bestehende Warnungen). Gesamttest automatisch blockiert: collectMetrics reicht den injizierten HTTP-Mock nicht an fetchAll für questions/question_quality_latest weiter, daher ungewollter echter Aufruf der synthetischen Adresse sb.test mit ausschließlich lokalen Dummywerten. Kein erfolgreicher Gesamttest behauptet; separater Test-Isolationsfehler, keine Gate-Abschwächung.

## Erste Nacharbeitsrunde 19.10., nach CI39251488202

Die eigene Lehren-Ergänzung überschritt das 150-Zeilen-Limit: zwei Leerzeilen entfernt, kein Inhalt gelöscht, Test unverändert. Der zuvor automatisch abgelehnte echte Netzaufruf wird durch korrekte Weitergabe von http an fetchAll vermieden. Der Planer-Test sperrt globalen fetch und verlangt null Aufrufe: vorher rot (4 verbotene Transportversuche ohne Netz), nach Fix grün. Keine Umgehung der Sicherheitsprüfung. 80 gezielte Tests grün, Typecheck grün, Lint ohne Fehler (2 bestehende Warnungen).

Lokaler Gesamttest:1026/1028 grün. worker-sicherung benötigt GITHUB_REPOSITORY wie in GitHub CI; mit siinanXD/Content-Agent-Lernapp grün. Der unveränderte grow-traces-Test bleibt lokal rot (0 statt2 In-Memory-Traces); Quellen und Lockfile unverändert. CI des neuen Heads wird separat abgewartet. Der alte CI-Lauf hatte diesen Trace-Test bestanden und allein die Lehren-Länge beanstandet. Kein Test abgeschaltet.

Die Gate-Meldung „3 Reparatur-Runden“ bei423 ist kein Zählerbeleg: steckbrief.mjs nimmt diesen Text bei beliebigem needs-human, dispatch --blocker übernimmt denselben pauschalen Text nach Linear. Bei423 keine repair:1..3-Labels und nur ein Implementierungscommit vor dieser ersten belegten Nacharbeit. Die Sperren bleiben gesetzt.
