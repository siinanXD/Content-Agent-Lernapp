# Figma-Abgleich SIN-274: „fehlt in Figma: 17 Zustände“

Stand 2026-10-06, Figma-Token war verfügbar (`node scripts/autonomy/figma.mjs`).

## Befund

Die Meldung zählt keine 17 Zustände. `17 Zustände` ist der Frame-Name aus der Screens-Tabelle in `FIGMA.md`.
Der Namensabgleich (`readiness.mjs`, Prüfung `design-figma`) fand ihn nicht, weil der Frame in Figma
`17 Zustände (Laden · Leer · Fehler · Offline)` heißt (Knoten 21:409). Alle anderen erwarteten Frames sind vorhanden.

## Entscheidung je Eintrag

| Eintrag | Figma | Code | Entscheidung |
| --- | --- | --- | --- |
| Frame-Name `17 Zustände` | `17 Zustände (Laden · Leer · Fehler · Offline)` | – | angleichen: `FIGMA.md` führt den vollen Namen |
| Offline: Titel und Text | „Du bist offline“ / „Geladene Einheiten kannst du weiter lernen. Ergebnisse werden später übertragen.“ | war „Keine Verbindung“ / anderer Text | angleichen: Standardtexte in `StateView` auf Figma-Wortlaut |
| Fehler: Titel | „Das hat nicht geklappt“ | gleich | stimmt überein |
| Fehler: Text | „Die Einheit konnte nicht geladen werden. Deine Antworten sind gespeichert.“ | generisch („Bitte versuche es noch einmal.“), Seiten übergeben eigenen Text | dokumentieren: Figma zeigt den Fall „Einheit“, die Variante ist kontextabhängig |
| Leer: Titel und Text | „Keine fälligen Wiederholungen“ / „Super. Mach mit einer neuen Einheit weiter.“ | generisch, Seiten übergeben eigenen Text | dokumentieren: Figma zeigt den Fall „Wiederholung“, Variante je Seite |
| Laden | drei graue Platzhalterbalken (`#E7E5E4`) in weißer Karte | Spinner | dokumentieren, Anpassung offen (siehe unten) |
| Aufbau der Zustände | weiße Karte (Radius 16, Padding 16), Icon und Titel in einer Zeile, linksbündig | zentriert, ohne Karte | dokumentieren, Anpassung offen (siehe unten) |

## Offen im Code (kein neues Design nötig)

Karten-Aufbau und Platzhalterbalken für „Laden“ sind in Figma bereits definiert. Sie gehören nicht ins Design-Paket,
sondern in ein eigenes Code-Issue, weil sie alle Seiten mit `StateView` und die E2E-Tests betreffen.

## Für das Design-Paket

Nichts. Kein Zustand fehlt in Figma.
