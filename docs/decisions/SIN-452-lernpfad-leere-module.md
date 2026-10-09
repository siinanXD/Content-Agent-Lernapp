# SIN-452: Lernpfad zeigt Module ohne Einheiten als Leerzustand

- Links: [SIN-452](https://linear.app/sinan-kahraman/issue/SIN-452), Figma Screen 17 (Leer-/Ladezustände), `docs/content/maf-metall.json`
- Entscheidung: Die Seite `/lernpfad` bekommt die Modulliste des Kurses (`loadMafCurriculum`, nach `order`) und zeigt jedes Modul. Hat es 0 Einheiten, erscheint eine Kachel „Noch keine Einheiten“ mit kurzem Text, ohne Link oder Knopf, per Tastatur fokussierbar (`tabIndex=0`, `role="group"`, `aria-label`), Höhe ≥ 44 px, sichtbarer Fokusring. Die Prüfungsreife rechnet weiter nur Module mit Einheiten.
- Annahmen: Figma war nicht lesbar (`figma.mjs` lieferte HTTP 400). Deshalb nur vorhandene Tokens und das Kachel-Maß der Seite (16 px Innenabstand, `--radius-md`), keine neue Komponente und keine neuen Farben. Fehlt die Kursdatei, zeigt der Pfad wie bisher nur Module mit Einheiten. Der Text „wird nach und nach gefüllt“ nennt keine Zahlen und keinen Termin.
- Warum: Bisher fehlten die 12 leeren Module im Pfad ganz. Wer den Kurs ansieht, hielt ihn für kürzer als er ist. Die Kachel trennt Leerstand klar von Modulen mit Inhalt, ohne toten Startknopf.
