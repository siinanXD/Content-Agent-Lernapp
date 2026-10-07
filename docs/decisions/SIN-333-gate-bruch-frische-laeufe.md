# SIN-333: Gate-Bruch zählt nur frische Läufe, ohne Dependabot, mit Gegencheck auf main

- Issue: https://linear.app/sinan-kahraman/issue/SIN-333
- Baut auf: [SIN-327](SIN-327-urgent-und-wartende-prs.md). Auslöser: SIN-330/331 waren Fehlalarme aus alten Läufen und Dependabot-PRs.

## Entscheidung

- Ein roter Check zählt nur, wenn sein Lauf nach dem letzten Merge auf `main` gestartet ist (`merged_at` des jüngsten gemergten PRs gegen `started_at` des roten Check-Laufs).
- PRs von `dependabot[bot]` zählen nie (Hauptversionen brechen den Build absichtlich).
- Vor dem Anlegen wird der Check auf `main` gelesen (letzter Lauf je Name, `commits/main/check-runs`). Ist er grün: kein Issue, die PRs bekommen `update-branch` (CI läuft neu, Aktion `gate-rerun`).
- Dubletten: unverändert über den Titel `Bug: Gate-Bruch auf main: <Check> / <Schritt>` (offen und letzte 24 h erledigt).

## Annahmen

- Fehlt der `main`-Stand (Abruf scheitert) oder ein Startzeitpunkt, wird dort nicht gefiltert; nur der Gegencheck entfällt.
- Ist der Check auf `main` rot oder unbekannt, gilt der Bruch als echt.
- Der letzte Merge wird aus den zuletzt geänderten 100 PRs gelesen, die der Wächter ohnehin lädt.

## Warum

Zwei Worker jagten Fehlalarmen nach, während der echte Notfall (Deploy) wartete. Eigenbau, keine neuen Pakete.
