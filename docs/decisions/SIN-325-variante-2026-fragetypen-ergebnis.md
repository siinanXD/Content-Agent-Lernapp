# SIN-325: Variante 2026 · 2/4: Fragetypen und Ergebnis (W5)

- **Links:** Linear [SIN-325](https://linear.app/sinan-kahraman/issue/SIN-325), [SIN-316](https://linear.app/sinan-kahraman/issue/SIN-316); Figma [Lern-App](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz); Regeln `docs/design/regeln-2026.md`
- **Entscheidung:** Lückentext, Zuordnen, Reihenfolge und Rechnen/Offen bekommen Mono-Labels (`.mono-label`), 2-px-Rahmen wie `OptionChoice`, Bedienziele ≥ 44 px (Pfeiltasten der Reihenfolge, Checkboxen der Selbstkontrolle) und die Musterlösung als Fläche mit `--radius-lg`. Die Ergebnis-Seite (W5) nutzt das Bento-Raster: Hauptkachel (`bento-main`) mit Überschrift, `ProgressRing` (richtig/gesamt) und der einen Aktion „Weiter lernen“, darunter Kacheln „Heute“ (Punkte, Serie), Tagesziel, „Morgen dran“ und Erinnerung. `ProgressRing` bekommt die Eigenschaft `name` (Standard „Tagesziel“). Keine neue Komponente, Farbe oder Abhängigkeit.
- **Annahmen:**
  - Figma W5 und die Fragetyp-Screens nicht gelesen: Knoten-IDs unbekannt, der Token kann die Seite „Variante 2026“ nicht auflisten (wie SIN-314, SIN-323). Aufbau nach den Regeln 2026; beim Abgleich anpassen.
  - Der Verlauf im Kopf der Ergebnis-Seite entfällt (Anti-Slop: keine Verläufe). Die erfundenen Standardwerte („Elektrische Gefahren“, 5 von 6, 120 Punkte) entfallen ebenfalls: ohne gespeichertes Ergebnis zeigt die Seite nur Überschrift, Tagesziel und „Morgen dran“.
  - „Zur Wiederholung“ und „Für heute fertig“ bleiben als zweitrangige Knöpfe unter den Kacheln; die Hauptaktion ist „Weiter lernen“.
- **Warum:** Wiederverwendung der Bento-Klassen und des Rings hält die Oberfläche einheitlich und vermeidet neue Bausteine.
