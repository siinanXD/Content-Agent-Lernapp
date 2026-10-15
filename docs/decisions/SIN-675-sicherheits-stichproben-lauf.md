# SIN-675: Sicherheits-Stichproben: Lauf starten und Ergebnis mit Beleg eintragen

- **Links:** Linear [SIN-675](https://linear.app/sinan-kahraman/issue/SIN-675/sicherheits-stichproben-lauf-starten-und-ergebnis-mit-beleg-eintragen), Vorläufer [SIN-656](https://linear.app/sinan-kahraman/issue/SIN-656) (`docs/decisions/SIN-656-sicherheits-stichprobe-lauf.md`), [SIN-404](https://linear.app/sinan-kahraman/issue/SIN-404) (`docs/decisions/SIN-404-sicherheits-lauf.md`), [SIN-272](https://linear.app/sinan-kahraman/issue/SIN-272) (`docs/decisions/SIN-272-sicherheits-stichprobe.md`), Lauf-Workflow `.github/workflows/run-task.yml` (Aufgabe `safety-sample`), Produktreife `docs/product-readiness.json` (Eintrag `content-safety`, Stufe „gebaut, nicht gelaufen“), Live-App `https://content-agent-ashen-nu.vercel.app` (`docs/autonomy/config.json`)
- **Entscheidung:** Kein Eintrag unter `gelaufen["content-safety"]` ohne echten Lauf. Der Lauf wird als Workflow `run-task` mit Aufgabe `safety-sample` gestartet (`gh workflow run run-task.yml -f task=safety-sample`). Erst das Ergebnis (Lauf-Link, Zahlen, Rohdaten unter `docs/quality/runs/`) trägt den Eintrag in `docs/product-readiness.json` ein.
- **Stand dieser Sitzung (Blocker):**
  - `gh workflow run` wurde von der Agenten-Shell mit „This command requires approval“ abgelehnt. Ebenso `gh auth status`, `gh run list` und `curl`. Die Freigabe wurde nicht umgangen (kein `dangerouslyDisableSandbox`).
  - Erreichbarkeit der Live-App ist belegt: Ein Abruf von `/api/learner/phase-a` über das Abruf-Werkzeug lieferte veröffentlichte Kursdaten (Kurs „Maschinen- und Anlagenführer“, Phase A, Status `published`). Die Anzahl der Einheiten und Befunde ist damit **nicht** gemessen; der Abruf war nur ein Erreichbarkeitstest, kein Stichprobenlauf.
  - Es wurde kein Token gesucht oder verwendet (AGENTS.md: Zugangsdaten nicht anfassen).
  - Ohne Lauf-Link und Rohdaten wäre ein Eintrag in `docs/product-readiness.json` erfunden. Deshalb bleibt der Punkt unverändert.
- **Annahmen:**
  - Kein Secret nötig: `/api/learner/phase-a` antwortet öffentlich (SIN-404). Ob die Middleware den Abruf im Workflow-Lauf sperrt, zeigt erst der Lauf.
  - Befunde sind ein Ergebnis, kein Fehler (Exit 2 in `scripts/safety-sample.mjs`). Ein Befund wird im Ergebnis genannt, nicht als Lauf-Fehler gewertet.
  - Die Bestätigung „erfüllt“ bleibt bei einem Menschen (SIN-338). Der Lauf trägt nur unter `gelaufen` ein.
- **Warum:** Der Lauf ist die fehlende Stufe; das Werkzeug existiert seit SIN-404. Ein Eintrag ohne Beleg würde die Produktreife-Zeile fälschen.
- **Nächster Schritt:** Ein Mensch oder ein Agent mit Freigabe für `gh` startet `run-task` mit Aufgabe `safety-sample`. Danach Artefakt `run-safety-sample` nach `docs/quality/runs/` übernehmen, Eintrag `gelaufen["content-safety"]` mit Datum, Lauf-Link und Befund setzen, `npm run decisions:index` ausführen und per PR mergen.
