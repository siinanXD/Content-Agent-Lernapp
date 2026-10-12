# SIN-476: Lernweg-Schritte bis zur ersten Einheit

- Links: Linear SIN-476; Figma W1 56:369, W2 56:381, W3 56:401 (Dateien nicht neu gelesen, keine Optik geändert)
- Entscheidung: Auf `/beruf` führt die Wahl des Berufs direkt weiter. Der zusätzliche Knopf „Weiter“ entfällt. Keine neue Komponente, keine neuen Tokens.

## Zählung (Azubi, Erststart bis erste Frage)

Vorher: 7 Bedienschritte, 6 Seiten.

1. `/willkommen`: „Los geht’s“
2. `/einwilligung`: Einverstanden oder Ablehnen
3. `/beruf`: Beruf wählen
4. `/beruf`: „Weiter“ (entfällt)
5. `/schwerpunkt`: Schwerpunkt wählen
6. `/schwerpunkt`: „Lernpfad erstellen“
7. `/lernpfad`: heutige Einheit öffnen

Nachher: 6 Bedienschritte. Industriekaufmann/-frau: 5 (kein Schwerpunkt).

## Annahmen

- PostHog zeigte in 7 Tagen keine Lernweg-Ereignisse; ob das an Einwilligung (Ablehnen sperrt Tracking) oder fehlendem Verkehr liegt, ist ohne PostHog-Zugriff nicht prüfbar.
- Nicht entfernt: Willkommen (Figma W1), Einwilligung (Pflicht), Schwerpunkt-Knopf (Betrieb-Wahl bei zwei Maps bleibt möglich).

## Warum

Eine Kachel mit Folgeaktion braucht keinen Bestätigungsknopf; ein Tipp weniger senkt Abbrüche. Tastaturbedienung bleibt: Kacheln sind Buttons (Enter/Space).
