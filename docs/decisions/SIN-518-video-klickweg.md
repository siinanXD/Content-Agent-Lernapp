# SIN-518 — Video-Agent: Klickweg hängt im ersten Lauf

**Links:** [Linear SIN-518](https://linear.app/sinan-kahraman/issue/SIN-518), [Playwright Timeouts](https://playwright.dev/docs/test-timeouts), `video/aufnahme.spec.ts`, `playwright.video.config.ts`, `.github/workflows/video.yml`

## Entscheidung

1. **Ursache (aus dem Code abgeleitet):** Die Fragenschleife klickte nur `button[aria-pressed]` (Auswahlfragen). Lückentext mit Auswahlfeld, Zuordnen und Rechnen haben diese Knöpfe nicht; „Antwort prüfen“ bleibt gesperrt und der Klick wartet bis zum Test-Timeout.
2. `beantworte()` bedient jeden Fragetyp (Auswahl, Select, Textfeld, Musterlösung, Selbstkontrolle).
3. Einwilligung („Ablehnen“) wird nur geklickt, wenn sie sichtbar ist.
4. `actionTimeout` 20 s: ein hängender Klick scheitert mit Namen. Test-Timeout = 120 s + 20 s je möglicher Frage (max. 12). Trace bei Fehlern.
5. Workflow lädt bei Fehlern `video-ergebnis/dateien/**` als Artefakt `video-fehlerkontext` hoch.

## Annahmen

- Der Fehlerkontext des ersten Laufs liegt nicht vor, die Ursache ist abgeleitet, nicht belegt. Der nächste Handlauf zeigt es; bei erneutem Fehler steht der Schritt im Artefakt.
- Die Zeile in `werbemittel` entsteht erst nach dem Handlauf von `video` nach dem Merge.

## Warum

Billigste Reparatur ohne neue Abhängigkeiten; Fehler sollen künftig sichtbar sein, statt 120 s zu hängen.
