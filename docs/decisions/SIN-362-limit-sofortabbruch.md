# SIN-362: Claude-Sofortabbruch als Limit, Stopp bei Läufen ohne PR

- Issue: https://linear.app/sinan-kahraman/issue/SIN-362
- Bezug: SIN-291 (Selbst-Diagnose), SIN-223 (Budget), SIN-310 (Aufgaben für Sinan)

## Entscheidung

1. **Limit-Muster:** Ein Claude-Ergebnis mit `is_error: true`, aber `total_cost_usd` 0 oder leerem `modelUsage` zählt als leeres Kontingent (`isInstantAbort` in `budget.mjs`). Die Pause ist die Reset-Zeit aus dem Text, sonst +5 h. `error_max_turns` zählt nie.
2. **Zweimal ohne PR → `needs-human`:** `dispatch.mjs --no-pr` zählt die Kommentare „beendet, aber kein PR“ seit dem letzten „Worker fertig“. Beim zweiten Lauf in Folge setzt es das Label `needs-human` und kommentiert den letzten Grund. Läufe am Claude-Limit zählen nicht.
3. **Lauf-Aufträge:** Der Planer vergibt für `lauf`-Aufträge (Prüfpunkt „gebaut, nicht gelaufen“ oder `bereich:lauf`) `needs-human` statt `claude`. Der Worker darf Workflows mit echten Secrets nicht starten.
4. **Loop-Status:** Worker-Läufe werden getrennt über `workflows/worker.yml/runs` geholt (die 100 jüngsten Läufe aller Workflows verdrängten sie). Die Fehlerzeile des Workers nennt „Claude-Limit erkannt“; der Status zeigt dann einen Vorfall.

## Annahmen

- Das Beispiel-Log aus dem Issue war nicht abrufbar; die Fixture `docs/autonomy/fixture-claude-sofortabbruch.json` bildet die genannten Merkmale nach (`is_error`, 0 Kosten, `modelUsage: {}`, 1 Zug).
- Fehlen `total_cost_usd` und `modelUsage`, gilt ein Fehler nicht als Limit (sonst würde jeder Fehler pausieren).
- Das Label `needs-human` existiert im Linear-Team (wurde von Hand schon genutzt).

## Warum

Ohne Pause startete der Dispatcher in der Nacht weiter Worker, und SIN-348 lief 17-mal ohne PR. Nach zwei Läufen ohne PR ist die Ursache kein Zufall mehr; ein Mensch muss sie klären.
