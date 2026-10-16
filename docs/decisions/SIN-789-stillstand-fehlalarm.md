# SIN-789: Fehlalarm „Kein Worker seit 2119 Min“

- Issue: https://linear.app/sinan-kahraman/issue/SIN-789
- Entscheidung: Der Wächter (`status.mjs`) rechnet den Leerlauf ab dem letzten `loop_events`-Eintrag mit `step=worker` (`fetchLastWorkerAt`), Rückfall sind die Actions-Läufe. Die Schlange nutzt dieselbe `startOrder` wie der Dispatcher, aber mit `ideaSlot: false`: Ideen zählen nie als startbar. Ist die Schlange leer und PRs sind offen, steht „wartet auf … offene PRs und das nächste Nachfüllen“ statt einer Stillstands-Diagnose.
- Annahmen: Ist `loop_events` nicht lesbar, gilt der alte Rückfall. Eine Idee, die der Dispatcher wöchentlich startet, löst dadurch nie einen Stillstand aus, weil der Dispatcher sie ohnehin selbst nimmt.
- Warum: Die alte Rechnung nahm den ältesten Zeitstempel (Issue-Änderung, 35 h) statt des letzten Workers (17:27 UTC) und zählte eine Idee mit, die der Dispatcher nicht startet. Eine zweite Regel für „startbar“ wäre eine neue Fehlerquelle.
