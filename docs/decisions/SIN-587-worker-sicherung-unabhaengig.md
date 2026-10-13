# SIN-587: Worker-Sicherung hängt nicht mehr an „Fehler auswerten“

- Linear: https://linear.app/sinan-kahraman/issue/SIN-587
- Vorgänger: SIN-548 (Pause nach 3 Fehlläufen), SIN-362 (`needs-human`), SIN-456 (Befund)

## Entscheidung

- `dispatch.mjs --no-pr` fängt Fehler ab (Linear, Label, Netz), schreibt „Fehler auswerten gescheitert: <Grund>“ ins Log und als `loop_events`-Zeile (`worker`, `fehler`, Spalte `grund`). Fehlt das Label `needs-human`, geht das Issue trotzdem zurück auf Todo.
- In `worker.yml` hat „Fehler auswerten“ `continue-on-error`. „Wiederholte Fehlläufe prüfen“, „Dispatcher anstoßen (Platz frei)“, „Pause bis Reset setzen“ und die Rot-Markierung laufen mit `always()` und prüfen nur noch `has_pr != 'true'` bzw. die Ausgaben, nie `steps.limit.outcome`.

## Annahmen

- Das Log von Lauf 38418442183 war für den Agenten nicht lesbar. Die genaue Ausnahme ist daher nicht belegt. Wahrscheinlichste Stellen in `--no-pr`: `findByIdentifier` (Issue nicht im Projekt), `addLabel` (`needs-human` fehlt im Team) und Linear-Abfragen. Alle sind jetzt abgefangen und tauchen mit Grund im Leitstand auf.

## Warum

Die Sicherung darf nie von dem Schritt abhängen, dessen Ausfall sie abfangen soll.
