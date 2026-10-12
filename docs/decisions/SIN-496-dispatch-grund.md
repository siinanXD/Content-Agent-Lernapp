# SIN-496 — Stillstand `ohne-start`: Grund des Dispatchers im Bericht

- **Links:** Linear [SIN-496](https://linear.app/sinan-kahraman/issue/SIN-496/stillstand-laufe-ohne-fehler-aber-kein-worker-gestartet); Vorgänger [SIN-328](SIN-328-stillstand-ohne-log.md).
- **Entscheidung:** `collectLogs` (status.mjs) hängt bei einem grünen dispatch-Lauf die Zeilen „Nichts zu starten: …“, „… wartet …“, „Abgleich: …“ aus dem Job-Log an (`dispatchReasonLines`). Der Wächter zeigt damit im Auszug, welche Stelle den Start verhinderte (Slots, Blocker, Wartezeit, Phase, Pause).
- **Annahmen:** Die Logs von Lauf 38256570388 waren ohne GitHub-Zugriff nicht lesbar; die konkrete Ursache dieses Vorfalls ist daher nicht belegt. Der Dispatcher-Code selbst (pickMany, Phase, Pause) zeigte keinen Fehler. Nicht lesbare Logs ändern nichts (leerer Grund).
- **Warum:** „Kein roter Lauf“ allein ist nicht bearbeitbar; die Ausgabe des Dispatchers nennt den Grund direkt.
