# SIN-403 Fehler-, Leer- und Ladezustände für alle Routen

- Links: Figma Screen 17 (Datei `0SWGDO2ioBD3MyXiAnrbRz`), `src/components/ui/state-view.tsx`
- Entscheidung: `app/error.tsx`, `app/not-found.tsx` und `loading.tsx` (lernpfad, wiederholung, pruefung, ergebnis) nutzen nur die vorhandene `StateView`. Diese bekommt die Option `heading`: Titel als `h1`, beim Einblenden fokussiert.
- Annahmen: Die Figma-API lieferte HTTP 400 („nicht verfügbar“). Die Werte stammen deshalb aus den vorhandenen Tokens und der bestehenden Fehlerseite der Einheit. Ladezustände haben eine feste Mindesthöhe (480 px), damit der CLS nicht steigt.
- Warum: Keine neuen Komponenten oder Farben; eine fokussierte Überschrift hilft Screenreadern und Tastaturnutzern.
