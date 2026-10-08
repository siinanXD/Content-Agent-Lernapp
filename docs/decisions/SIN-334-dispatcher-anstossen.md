# SIN-334: Dispatcher sofort nach Merge und bei frei gewordenem Platz anstoßen

- Issue: https://linear.app/sinan-kahraman/issue/SIN-334
- Baut auf: SIN-237 (Selbst-Anstoß), SIN-234 (Zeitpläne unzuverlässig)

## Entscheidung

- `post-merge.yml` stößt nach dem Nachholen eines Bot-Merges `dispatch.yml` per `workflow_dispatch` an (Agenten-Token). Bei Merges durch den Agenten-Token macht das weiter der Job `linear-done` in `dispatch.yml`.
- `worker.yml`: Endet ein Worker ohne PR (ohne Limit-Pause), stößt er den Dispatcher nach 5 Minuten Abstand an.
- Doppelstarts: Die Gruppe `dispatch` (`cancel-in-progress: false`) im Job `dispatch` bestand schon und bleibt. Der 30-Min-Zeitplan bleibt als Rückfall.

## Annahmen

- Der 5-Minuten-Abstand nach „Worker ohne PR“ verhindert, dass ein Issue mit Label `claude` im Sekundentakt neu startet (der Dispatcher hat keine Abkühlzeit).
- Der Nachweis „Start innerhalb von 5 Minuten“ mit Zeitstempeln ist erst nach dem Merge am nächsten Lauf möglich.

## Warum

GitHub verschiebt Zeitpläne um 10–20 Minuten; der freie Platz blieb bis zu ca. 45 Minuten leer.
