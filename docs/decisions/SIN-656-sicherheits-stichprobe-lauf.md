# SIN-656: Sicherheits-Stichproben als Lauf-Auftrag starten und Ergebnis belegen

- **Links:** Linear [SIN-656](https://linear.app/sinan-kahraman/issue/SIN-656/sicherheits-stichproben-als-lauf-auftrag-starten-und-ergebnis-belegen), Vorläufer [SIN-404](https://linear.app/sinan-kahraman/issue/SIN-404) (`docs/decisions/SIN-404-sicherheits-lauf.md`), [SIN-272](https://linear.app/sinan-kahraman/issue/SIN-272) (`docs/decisions/SIN-272-sicherheits-stichprobe.md`), Lauf-Workflow `.github/workflows/run-task.yml` (Aufgabe `safety-sample`, Muster SIN-302), Produktreife `docs/product-readiness.json`
- **Entscheidung:** Der Lauf läuft als Aufgabe `safety-sample` über `workflow_dispatch` im Workflow `run-task`. Ergebnis, Rohdaten unter `docs/quality/runs/` und der Eintrag `gelaufen["content-safety"]` in `docs/product-readiness.json` entstehen erst, wenn dieser Lauf im Workflow grün durchgelaufen ist. Dieser Schritt ist in der Sitzung, in der SIN-656 bearbeitet wurde, nicht erfolgt.
- **Stand dieser Sitzung (Blocker):**
  - `gh` ist im Agenten-Shell gesperrt (`requires approval`), deshalb konnte weder `gh workflow run run-task.yml -f task=safety-sample` ausgelöst noch der letzte Lauf abgefragt werden.
  - Die Live-Erreichbarkeit von `https://content-agent-ashen-nu.vercel.app` (`docs/autonomy/config.json`) wurde nicht geprüft, weil der Shell-Aufruf ebenfalls gesperrt war.
  - Es wurde kein Token aus der Umgebung gesucht oder verwendet, um den Workflow über die API zu starten (AGENTS.md: Zugangsdaten nicht anfassen).
  - Es wurde kein Eintrag in `docs/product-readiness.json` geschrieben: ohne Lauf wäre der Beleg erfunden.
- **Annahmen:**
  - Kein Secret nötig: `/api/learner/phase-a` ist ein öffentlicher GET (SIN-404). Fehlt das Secret doch oder blockt die Middleware den Abruf, zeigt erst der Lauf. Dann entsteht ein `sinan`-Issue, nicht vorher.
  - Befunde sind ein Ergebnis, kein Fehler (Exit 2 in `scripts/safety-sample.mjs`). Pro Befund ein eigenes Issue, sobald die Zahlen und der Bericht vorliegen.
  - Der Planer startet die Aufgabe selbst, solange `content-safety` als „gebaut, nicht gelaufen“ gilt (`isRunnable`). Sobald der Lauf-Auftrag grün durchläuft und der Eintrag unter `gelaufen` steht, endet das.
- **Warum:** Das Werkzeug existiert seit SIN-404. Die fehlende Stufe ist der Lauf selbst. Ein Eintrag ohne Lauf würde die Produktreife-Zeile fälschen, deshalb bleibt der Punkt offen und der Blocker sichtbar.
- **Nächster Schritt:** Lauf von Hand starten (Actions → `run-task` → Aufgabe `safety-sample`, oder `gh workflow run run-task.yml -f task=safety-sample`). Danach Rohdaten aus dem Artefakt `run-safety-sample` nach `docs/quality/runs/` übernehmen und den Eintrag mit Lauf-Link in `docs/product-readiness.json` setzen.
