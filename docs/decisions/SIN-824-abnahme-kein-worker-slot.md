# SIN-824: Abnahme belegt keinen Worker-Platz

Quelle: https://linear.app/sinan-kahraman/issue/SIN-824 samt Kommentar19.10.

Dispatch39235755406/job118004289658 meldet „2 Issues laufen schon(max2)“, obwohl Status39248790721 keinen Worker und acht startbare Aufgaben zeigt. Aktuelle Linear-Zustände: SIN-811 In Progress, SIN-537 In Review. Beide haben type started. pickMany zählt beide, solange waitingIssues sie nicht als wartend erkennt. SIN-537 hat keinen offenen PR im Produktrepo und fiel deshalb durch diesen Filter.

waitingIssues behandelt In Review ohne nachgewiesen aktiven Worker als Abnahmewarten, auch ohne Produkt-PR. Dispatcher, Status/Kick und Snapshot nutzen dieselbe Funktion. Ein tatsächlich aktiver Worker behält seinen Platz. Bei unbekanntem Worker-Stand gibt der Dispatcher keine Slots zusätzlich frei. Kein Issue wird dafür Done oder Todo gesetzt.

Regression zuerst rot: In Review537 plus wartender Freigabe-PR811 blockieren zwei Todos; nach Fix werden beide gewählt. Zusätzliche Gegenprobe: aktiver Worker behält seinen Platz; Status/Kick/Snapshot stimmen überein. Echter Dispatch-/Worker-Nachweis nach unabhängiger Prüfung und regulärem Merge offen.

Ausgelassen: keine Rechte, Secrets, Limits oder Rulesets geändert; keine zusätzliche Steuerungsplattform und keine Wiederaufnahme bereits ausgeschöpfter Reparaturen411/416.

Prüfung: 61 gezielte Tests grün; Typecheck grün; Lint ohne Fehler (2 bestehende Warnungen). Gesamttest automatisch blockiert: collectMetrics reicht den injizierten HTTP-Mock nicht an fetchAll für questions/question_quality_latest weiter, daher ungewollter echter Aufruf der synthetischen Adresse sb.test mit ausschließlich lokalen Dummywerten. Kein erfolgreicher Gesamttest behauptet; separater Test-Isolationsfehler, keine Gate-Abschwächung.
