# SIN-315: Variante 2026, Teil 1: Onboarding und Lernpfad (Heute)

- **Links:** Linear [SIN-315](https://linear.app/sinan-kahraman/issue/SIN-315), [SIN-314](https://linear.app/sinan-kahraman/issue/SIN-314), [SIN-318](https://linear.app/sinan-kahraman/issue/SIN-318); Figma [Lern-App](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz); Regeln `docs/design/regeln-2026.md`
- **Entscheidung:** Willkommen (W1), Einwilligung (W2), Schwerpunkt (W3) und Lernpfad „Heute“ (A1) nutzen das Bento-Raster aus SIN-318 (`.bento`, `.bento-tile`, `.bento-main`, `.bento-label`, neu `.bento-span-*` ab 768 px). Hauptkachel „Als Nächstes“ mit genau einer Aktion, daneben Tagesziel-Ring, Serie mit Wochenpunkten, Wiederholung und Prüfungsreife je Lernfeld; untere Navigation bleibt. Der Ring füllt sich in 250 ms, bei `prefers-reduced-motion` sofort. Kein neues Paket, keine neue Komponente: `NextUpCard` und `DailyGoal` wurden auf Bento umgestellt.
- **Annahmen:**
  - Figma nicht verfügbar: Der Lesetoken kann die Seite „Variante 2026“ nicht auflisten, die Knoten-IDs von W1, W2, W3, A1 sind unbekannt. Umgesetzt nach den Regeln; beim Abgleich anpassen.
  - „Prüfungsreife je Lernfeld“ zeigt nur den Anteil erledigter Einheiten (x/y) und sagt dazu, dass ein Mensch über die Zulassung entscheidet. Keine Prognose, keine erfundene Kennzahl.
  - Wochenpunkte: gefüllt, wenn an dem Tag mindestens ein Lernereignis vorliegt (`weekActivity`); vor dem Laden leer.
  - Einwilligung: beide Knöpfe gleiche Variante, Größe und Farbe.
  - Betrieb in W3 ist optional; ohne Wahl gilt die Standard-Map, der Text nennt sie.
  - Die Punkte-Pille und die zwei Schnellknöpfe „Wiederholung“/„Prüfungsmodus“ entfallen auf dem Lernpfad (Navigation und Wiederholungs-Kachel decken sie ab).
  - Zustände Laden, leer, Fehler, offline nutzen `StateView` (Screen 17) innerhalb der Kacheln. Die Einheiten kommen vom Server, daher gibt es keinen eigenen Ladezustand.
  - Die Lernpfad-Karte (02b, Zickzack) bleibt unverändert im Ablauf, nur Überschriften und Abstände folgen den Regeln.
- **Warum:** Vorhandene Klassen und Tokens halten die Seiten frei von Hex-Werten und Eigenbau-Komponenten.
