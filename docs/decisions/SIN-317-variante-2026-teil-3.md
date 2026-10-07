# SIN-317: Variante 2026 · 3/4: Wiederholung, Prüfung, Profil, Einstellungen

- **Links:** Linear [SIN-317](https://linear.app/sinan-kahraman/issue/SIN-317); Regeln `docs/design/regeln-2026.md` ([SIN-314](https://linear.app/sinan-kahraman/issue/SIN-314)); Figma [Lern-App](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz)
- **Entscheidung:** Wiederholung (W6), Prüfungsmodus Start, Prüfung läuft (W7), Prüfungsergebnis (W8), Profil (W9) und Einstellungen folgen den Bento-Regeln: eine Hauptkachel (`Tile tone="hero"`) mit einer Aktion, darunter kleinere Kacheln, Labels in Geist Mono (`.mono-label`). Neu ist nur der Baustein `src/components/ui/tile.tsx` (`Tile`, `Bento`), der Regel 1 der Regeln 2026 umsetzt, und die Klasse `.mono-label` aus den Tokens von SIN-314. Keine neue Farbe, keine neue Schrift. Zustände: leer („Heute alles geschafft“), Serie gerissen (bestehender Text, Profil zeigt „Letzte Serie“), Fehler (Profil), offline (Wiederholung, Einstellungen, W10).
- **Annahmen:**
  - Die Figma-Frames W6 bis W10 sind nicht gelesen: Der Lesetoken kann die Seite „Variante 2026“ nicht auflisten, die Knoten-IDs sind nicht bekannt (wie in SIN-314). Aufbau und Abstände folgen den Regeln 2026 und dem Issue-Text, nicht den Frames. Beim Abgleich mit Figma anpassen.
  - Der Wiederholungsplan zeigt „1 · 3 · 7 · 14“ Tage, weil der Leitner-Stapel vier Stufen hat (`LEITNER_INTERVALS_DAYS`). Das Issue nennt „1·3·7“.
  - „Meiste Fehler“ zählt die Prüfungsgebiete (`examAreas`) der Fragen im Stapel. Ein eigener Fehlerzähler je Frage existiert nicht.
  - Das Fragen-Raster der Prüfung ist nur eine Anzeige (aktuell, beantwortet, offen, markiert). Die Reihenfolge bleibt fest, weil jede Antwort sofort geprüft wird. Markierungen gelten nur für die laufende Prüfung und werden nicht gespeichert.
  - Das Profil zeigt nur echte Werte: Lerntage aus den lokalen Lernereignissen statt der festen „15 Tage“, Punkte nur mit vorhandener Sitzung statt „1.840“, Wochen-Säulen aus den Ereignissen. Der Platzhalter „Nächste Prüfungsthemen“ entfällt.
  - Die Einstellungen-Liste im Profil behält die beiden Schalter (Einfache Sprache, Vorlesen) und verlinkt auf `/einstellungen` für Datennutzung, Erinnerung und Daten.
  - Prüfungsergebnis bleibt Übung: Text „Das ist eine Übungsprüfung, keine Prognose der IHK“ unverändert.
- **Warum:** Ein gemeinsamer Kachel-Baustein hält die fünf Screens gleich und vermeidet Einzelstile; echte statt erfundener Zahlen halten AGENTS.md (Anti-Slop) ein.
