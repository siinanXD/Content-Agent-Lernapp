# SIN-818: Haken-Pause blockiert keine Startplätze

- Issue: https://linear.app/sinan-kahraman/issue/SIN-818
- Bezug: SIN-795 (Haken-Pause)

## Entscheidung

`withoutStalledHaken` läuft über die ganze Schlange (`startOrder`) und hört auf, sobald so viele Issues bereitstehen, wie Plätze frei sind (`want` aus `pickMany`). Angehaltene Issues werden übersprungen, die nächsten rücken nach. Der Dispatch-Grund nennt die übersprungenen Issues.

## Annahmen

- Der Haken-Start-Kommentar wird weiter nur für Issues geschrieben, die wirklich starten.

## Warum

Vorher wurden erst `want` Kandidaten gewählt und dann gefiltert: Pausierten beide, startete nichts (SIN-808, SIN-809 warteten 1,5 h).
