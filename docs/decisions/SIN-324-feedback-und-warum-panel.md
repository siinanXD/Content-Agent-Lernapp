# SIN-324: Variante 2026 · 2/4: Feedback falsch und „Warum?“-Panel

- **Links:** Linear [SIN-324](https://linear.app/sinan-kahraman/issue/SIN-324), [SIN-316](https://linear.app/sinan-kahraman/issue/SIN-316); Regeln `docs/design/regeln-2026.md` §4 ([SIN-314](https://linear.app/sinan-kahraman/issue/SIN-314)); Figma [Lern-App](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz)
- **Entscheidung:** `AnswerFeedback` bekommt für „richtig“ und „falsch“ denselben Stil (Rundung `--radius-lg`, Mono-Label „RICHTIG“/„FALSCH“, Icon und Titel tragen die Information). Neu ist `src/components/learner/why-panel.tsx`: ein nicht modales Panel von unten (Esc und „Schließen“), das den Inhalt darüber sichtbar lässt. Es zeigt Erklärung, Quelle und „KI-erklärt · geprüft“ und bietet „Einfacher erklären“, „Vorlesen“ und „Passt nicht? Melden“. Kein neues Paket, keine neue Farbe.
- **Annahmen:**
  - Figma nicht gelesen (Lesetoken kann die Seite „Variante 2026“ nicht auflisten, wie in SIN-315/317). Aufbau nach den Regeln 2026, beim Abgleich anpassen.
  - Die Fragetypen und das Ergebnis (`/ergebnis`) bleiben unverändert; die Akzeptanzkriterien nennen nur Feedback „falsch“ und das Panel.
  - „Einfacher erklären“ zeigt die vorhandene einfache Fassung der Einheit (`explanationSimple`); fehlt sie, entfällt der Knopf. Es gibt keinen KI-Aufruf zur Laufzeit und keine erfundene Erklärung.
  - „geprüft“ gilt, weil nur veröffentlichte Einheiten (Qualitäts-Schwelle bestanden) spielbar sind. Ohne Quelle erscheint „Warum?“ nicht (AGENTS.md, Grundsatz).
  - „Melden“ sendet das Ereignis `explanation_reported` (Einheit, Frage, keine Personendaten) über die vorhandene Analytik; ohne Einwilligung oder Schlüssel passiert nichts außer der Bestätigung im Panel. Ein eigener Meldeweg mit Ablage ist ein Folge-Issue, falls gewünscht.
- **Warum:** Vorhandene Bausteine und Tokens bleiben die Quelle; die Regel „KI ersetzt den Inhalt nie“ ist durch das nicht modale Panel eingehalten.
