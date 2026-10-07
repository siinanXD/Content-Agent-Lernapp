# SIN-323: Variante 2026 · 2/4: Einheit (W4) und Feedback richtig (A2)

- **Links:** Linear [SIN-323](https://linear.app/sinan-kahraman/issue/SIN-323), [SIN-316](https://linear.app/sinan-kahraman/issue/SIN-316), [SIN-314](https://linear.app/sinan-kahraman/issue/SIN-314); Figma [Lern-App](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz); Regeln `docs/design/regeln-2026.md` §4
- **Entscheidung:** Die Erklärung der Einheit (W4) steht in einer Kachel (`Tile`, `--radius-xl`) mit Mono-Labels (`.mono-label`) und der bestehenden SVG-Grafik (`UnitImageView`). Die Quelle steht als Quellen-Chip (`src/components/ui/source-chip.tsx`): Pille nach dem Muster von `StatChip`, nur Tokens. Dieselbe Pille zeigt im Feedback (`AnswerFeedback`, A2) die Quelle der Frage; sie ist ein Link (Ziel ≥ 44 px), wenn die Quelle eine http(s)-Adresse ist, sonst Text. Keine neue Farbe, kein neues Paket.
- **Annahmen:**
  - Figma W4 und A2 nicht gelesen: Die Knoten-IDs sind nicht bekannt, der Lesetoken kann die Seite „Variante 2026“ nicht auflisten (wie in SIN-314). Aufbau nach den Regeln 2026 und dem Issue; beim Abgleich anpassen.
  - Der Quellen-Chip der Einheit zeigt `sourceLabel` (z. B. „MaschFüAusbV · KMK RLP MAF“) ohne Link, weil die Einheit keine Adresse trägt.
  - Die Kennzeichnung „KI-erklärt · geprüft“ (Regel 4) ist nicht gesetzt: Im Datenmodell fehlt ein Merkmal „geprüft“, und ohne es wäre die Aussage erfunden. Sie kommt, sobald die Freigabe je Einheit gespeichert wird.
  - Die weiteren Fragetypen und das Ergebnis folgen in den Teilen 2 bis 4 von SIN-316.
- **Warum:** Ein kleiner Chip mit URL-Parsing macht die Quelle prüfbar, ohne neue Abhängigkeit oder Farbe.
