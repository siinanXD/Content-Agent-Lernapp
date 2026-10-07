# SIN-312: Index-Konflikte ohne KI lösen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-312/merge-konflikte-im-entscheidungs-index-automatisch-ohne-ki-losen
- Git: <https://git-scm.com/docs/git-merge> (Merge-Abbruch, `--theirs`), kein fertiges Open-Source-Werkzeug nötig (eigene 80 Zeilen, keine neue Abhängigkeit).

## Entscheidung

- `scripts/autonomy/konflikt.mjs`: Der Wächter (`status.yml`, vor `status.mjs`) mergt `origin/main` in jeden offenen Agenten-PR mit Konflikt. Betrifft der Konflikt nur `docs/DECISIONS.md` und `CHANGELOG.md`, wird der Index mit `scripts/decisions-index.mjs` neu erzeugt (CHANGELOG: Stand von main), committet und mit dem Agenten-Token gepusht. Kein Claude-Lauf.
- Echte Code-Konflikte: Merge wird abgebrochen, `status.mjs` bittet wie bisher @claude. Ist das Claude-Kontingent leer (`AGENT_PAUSED_UNTIL`), meldet der Wächter stattdessen mit @siinanXD den PR-Link und eine Kurzanleitung für den Web-Editor („Resolve conflicts“).
- `repair.yml`: Reihenfolge 1) main einmergen (erzeugte Dateien per Skript, Code-Konflikte bleiben als offener Merge für Claude), 2) Fehler beheben, 3) pushen.
- Der Index war schon deterministisch sortiert (Issue-Nummer absteigend, dann Dateiname); Test deckt zwei Fixture-Branches ab.

## Annahmen

- Statt eines separaten `sinan`-Issues genügt die Meldung im Loop-Status (Kommentar mit Erwähnung, einmal pro Vorfall); das spart Linear-Issues (Free-Limit).
- Nicht Teil dieses PRs, offen für Folge-Issues: Wiederhol-Bremse bei `is_error` (2 Fehlschläge je Issue/1 h, globale Pause), Fehlertext des Claude-Ergebnisses im Linear-Kommentar, Wächter-Regel „Reparatur ohne Push erneut anstoßen“ und Zählung von Runden ohne Push.

## Warum

Jeder PR ändert denselben Index; nach fast jedem Merge entsteht ein Konflikt, den ein Skript deterministisch lösen kann. Das spart Claude-Kontingent und löst den Konflikt innerhalb eines Wächter-Takts.
