# SIN-770 Crawler: Serie ohne Fund

- Issue: https://linear.app/sinan-kahraman/issue/SIN-770
- Baut auf: [SIN-640](SIN-640-testnutzer-agent.md) (Crawler läuft täglich 21:40 UTC über alle Routen aus `e2e/routes.ts`, Funde mit Dublettenprüfung)
- Fertig-Liste: `docs/FERTIG.md` (SIN-764)

## Entscheidung

Der Bericht des Crawlers in SIN-640 nennt „Serie ohne Fund: n von 3 Tagen in Folge“. Grundlage ist ein Marker `<!-- testnutzer-serie:JJJJ-MM-TT:ANZAHL -->` in jedem Crawler-Kommentar; `serie()` in `scripts/autonomy/testnutzer.mjs` zählt rückwärts die Tage mit 0 Funden. Ein Tag ohne Bericht (Lauf abgestürzt) oder mit Fund beendet die Serie.

## Annahmen

- „0 Fehler“ heißt 0 Funde des Crawlers (alle Kategorien: HTTP, Konsole, tote Links, Scrollen, LCP, axe), nicht nur Fehlerantworten.
- Ein Tag = UTC-Datum des Laufs; mehrere Läufe am Tag (manuell): der letzte zählt.
- Kein neuer Speicher: der Marker liegt im vorhandenen Linear-Kommentar, ausgelesen werden die letzten 50 Kommentare von SIN-640.
- Die Serie startet mit dem ersten Lauf nach dem Merge; „Done“ erst nach 3 Berichten in Folge mit „Ziel erreicht“ (SIN-616).

## Warum

Das Kriterium „drei Tage in Folge 0 Fehler“ war nirgends messbar. Ein Marker im Bericht braucht keine Abhängigkeit und keine Schemaänderung.
