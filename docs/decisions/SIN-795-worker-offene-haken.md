# SIN-795: Worker bei offenen Haken

Links: [SIN-795](https://linear.app/sinan-kahraman/issue/SIN-795), Vorgänger SIN-779 (Done nur mit belegten Haken), betroffen SIN-768 bis 770.

## Entscheidung

- Ursache war der Schritt „PR vorhanden?“ in `worker.yml`: `gh pr list --head claude/sin-N --state all` fand den alten, gemergten PR desselben Branch-Namens und meldete ihn als Ergebnis. Jetzt zählt nur ein PR, der offen ist oder nach `LAUF_START` (Beginn des Laufs) erzeugt wurde. Ohne neuen PR greift der bestehende Pfad „Fehler auswerten“ (Todo, Kommentar, nach 2 Läufen `needs-human`).
- Der Prompt enthält bei offenen `- [ ]`-Haken einen Abschnitt mit genau diesen Haken (`hakenPrompt`), den Hinweis, dass alte PRs kein Beleg sind, und `live.mjs blockiert SIN-N "<Grund>"` (Kommentar „blockiert: …“, Label `needs-human`, zurück auf Todo). Der Befehl liegt in `live.mjs`, weil dessen Aufruf in `allowedTools` schon erlaubt ist.
- Der Dispatcher schreibt beim Start eines Issues mit offenen Haken den Kommentar „Haken-Start <Kennzeichen>“. Stehen schon 2 davon mit demselben Kennzeichen (kein Haken dazwischen belegt), startet er nicht mehr, setzt `needs-human`, kommentiert und schreibt ein Ereignis `worker_pause` mit Grund in `loop_events`.

## Annahmen

- „Haken“ sind die `- [ ]`-Zeilen der Issue-Beschreibung (wie in SIN-779). Ein frisches Issue wird dadurch beim ersten Start einmal markiert; das schadet nicht.
- Gebündelte Zusatz-Issues (`rest`) werden nicht einzeln geprüft (shortcut: Bündel gibt es nur für Kleinkram; bei Bedarf in `withoutStalledHaken` nachziehen).
- Kommentare werden bis 50 gelesen; ältere Marker fallen heraus, das verlängert die Pause-Frist nur.

## Warum

Der kürzeste Weg: die Fehlerquelle (falsche PR-Erkennung) beheben, statt neue Erkennungslogik zu bauen; die vorhandene `needs-human`-Mechanik wiederverwenden.
