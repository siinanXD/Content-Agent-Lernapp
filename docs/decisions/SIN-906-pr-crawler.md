# SIN-906 PR-Crawler: nur geänderte Seiten auf der Vorschau

- Issue: https://linear.app/sinan-kahraman/issue/SIN-906
- Geprüft: fertige Lösungen sind Visual-Regression-Dienste (Chromatic, Percy) mit Kosten und eigener Cloud; Playwright ist schon im Repo ([Videos](https://playwright.dev/docs/videos): `recordVideo`, WebM). Ereignis [`deployment_status`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#deployment_status) liefert `environment_url` der Vorschau.
- Verwandt: SIN-640 (Testnutzer, nächtlicher Vollcrawl bleibt), SIN-523 (Sichtprüfung), SIN-254 (Vorschauen nur bei UI-Änderungen)

## Entscheidung

Neuer Workflow `pr-crawler.yml` (Auslöser `deployment_status` der Vorschau, nicht Production):

1. PR zur Deploy-SHA finden, geänderte Dateien per API lesen.
2. `scripts/pr-crawler/routen.mjs` leitet die Routen ab: `page.tsx` → Route, Komponenten und `lib`-Dateien → jede Seite, die sie über Importe erreicht (Layouts auf dem Weg zählen zur Seite). Höchstens 6 Seiten.
3. `scripts/pr-crawler/lauf.mjs` nutzt die Prüfung des Testnutzers (`pruefeSeite`, `klickeKnoepfe`, `beantworte`) nur für diese Routen: Bild je Route (Handy, Desktop), erste Frage auf Einheit und Prüfung beantworten, ab 2 Seiten ein Handy-Video (WebM, Grenze 10 MB).
4. `kommentar.mjs` schreibt oder ersetzt den Kommentar mit Marker `<!-- pr-crawler -->`. Ohne Frontend-Änderung steht dort „Übersprungen“ mit Grund.
5. Fund (außer LCP) = roter Lauf; Ereignis `pr-crawler` in `loop_events` mit Grund.

## Annahmen

- Das Repo ist öffentlich: Bilder liegen auf dem Zweig `pr-crawler/pr-<Nr>` (nur PNG) und werden über `raw.githubusercontent.com` im Kommentar gezeigt. Schlägt das Ablegen fehl, verweist der Kommentar auf das Artefakt. Das Video bleibt im Artefakt (Artefakte lassen sich nicht einbetten).
- Der Lauf ist ein eigener Check am Commit, kein neuer Pflicht-Check in `merge-gate` (das Gate zu ändern wäre `risk:high`, eigenes Issue).
- PRs aus Forks werden übersprungen: der Bypass-Schlüssel der Vorschau darf nicht an fremden Code gehen. Der PR-Stand wird nur gelesen, Skripte kommen aus `main`.
- LCP ist auf einer kalten Vorschau nur Hinweis; Fehler, tote Links, Seitwärts-Scrollen und axe färben rot.
- Zweige `pr-crawler/pr-<Nr>` werden nicht automatisch gelöscht (bekannte Grenze, später dem Aufräum-Agenten geben).

## Warum

Der Vollcrawl findet Nebenwirkungen erst nachts. Der Prüfer sah bisher keinen Live-Beleg; Bild und Video im PR schließen das, ohne neue Kosten (Actions-Minuten, keine KI).
