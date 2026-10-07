# SIN-310 — Aufgaben für Sinan als eigene Linear-Issues

- **Links:** Linear [SIN-310](https://linear.app/sinan-kahraman/issue/SIN-310/aufgaben-fur-sinan-als-eigene-linear-issues-label-sinan-mit-link-und); [Linear API: IssueCreateInput (`dueDate`)](https://linear.app/developers/graphql); [GitHub: fein-granulare Tokens](https://github.com/settings/personal-access-tokens); Vorgänger [SIN-294](SIN-294-notbremse-erreichbarkeit-token.md), [SIN-246](SIN-246-tages-update.md).
- **Entscheidung:**
  1. **Eigenbau `scripts/autonomy/sinan.mjs`**, keine fertige Lösung nötig: Es sind ein paar Linear-Aufrufe und Markdown. Keine neue Abhängigkeit, keine neuen Secrets (`LINEAR_API_KEY` haben Status, Tages-Update und Worker schon).
  2. **Issue = Label `sinan`**, Status Todo, Priorität 3, optional Fälligkeit. Das Label `claude` fehlt absichtlich; zusätzlich steht `sinan` in `HUMAN_LABELS`, der Dispatcher nimmt es nie. Beschreibung im festen Block `wo`, `link`, `minuten`, `schritte`, `pruefung`.
  3. **Erkennen von „erledigt“** über einen Merker `<!-- sinan: {"check":…} -->` in der Beschreibung. Drei Prüfarten, alle lesen nur Dateien im Repo: Rechts-Checkliste abgehakt, Token-Ablauf in `tokens.md` nach einem Stichtag, Hinweis in einer Datei entfernt. Der Loop schließt dann mit Kommentar („Automatisch geschlossen: …“).
  4. **Anzeige:** Tages-Update („Braucht dich“, höchstens 5 Zeilen mit Link und Minuten, Rest „… und n weitere“, Dringendes aus PRs steht davor) und Status-Seite („Braucht dich“, alle). `sync` läuft bei jedem Lauf beider.
  5. **Standard-Aufgaben** (`SEED`) tragen die offenen Anweisungen nach: Erreichbarkeits-Job, Wiederherstellungs-Test, Sicherheits-Stichprobe, AV-Verträge, Impressum, Datenschutztext, Pro-Tarife, GitHub-Tokens erneuern (fällig 20.12.2026). Titel, die es schon gibt (auch erledigt oder abgebrochen), werden nie neu angelegt.
- **Annahmen:**
  1. „Health-Aufruf gesehen“ (cron-job.org) kann der Loop nicht prüfen: `/api/health` zeigt nicht, wer aufruft. Dieses Issue, Pro-Tarife und Sicherheits-Stichprobe schließt Sinan selbst; die `pruefung` sagt das offen.
  2. Token-Daten: Nur `agent-workflows` (03.01.2027) kommt aus GitHub. `AGENT_VARIABLES_TOKEN` und `cron-takt` stehen als „ca. 03.01.2027“ (Mitte von 02.–04.01.2027, Anfang Oktober mit 90 Tagen angelegt); `parseExpiry` versteht den Vorsatz „ca.“. Die Warnung 14 Tage vorher greift damit sicher vor dem frühesten Datum.
  3. Token-Prüfung mit Stichtag 01.02.2027 statt „mehr als 30 Tage Restlaufzeit“: Heute laufen die Tokens noch ca. 88 Tage, eine Restlaufzeit-Regel hätte das Issue sofort geschlossen.
  4. Das Label `sinan` legt `createSinanIssues` bei Bedarf selbst an.
  5. Der Live-Lauf gegen Linear (Anlegen, Schließen) konnte hier ohne `LINEAR_API_KEY` nicht laufen; getestet ist alles mit Fake-Aufrufen. Die ersten Issues entstehen beim nächsten Status-Lauf nach dem Merge.
  6. Bestehende Rechts-Hinweise („Recht: n Punkte offen“) entfallen im Tages-Update, sobald `sinan`-Issues offen sind; sie stehen dann als Issues.
- **Warum:** Anweisungen an Sinan gehen in PR-Texten unter. Ein Issue je Aufgabe mit Link, Minuten und Prüfung ist am Handy auffindbar und schließt sich selbst, wo es der Loop sehen kann.
