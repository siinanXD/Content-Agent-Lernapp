# SIN-314: Design-Regeln 2026 festschreiben und Tokens ergänzen

- **Links:** Linear [SIN-314](https://linear.app/sinan-kahraman/issue/SIN-314); Figma [Lern-App](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz), [Leitstand](https://www.figma.com/design/7Ti9iVUjUjw3rh9WYhSu9K); [Motion](https://motion.dev/docs/react); [prefers-reduced-motion](https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion); [WCAG 2.2 Zielgröße](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Entscheidung:** Die Variante 2026 gilt für alle Apps. Die Regeln stehen in `docs/design/regeln-2026.md`. Neue Tokens in `docs/design/tokens.json` und `src/app/globals.css`: `--radius-xl` (24 px, Lern-App), `--radius-tool` (2 px, Leitstand), Bento-Abstände (`--bento-gap`, `--bento-gap-wide`, `--bento-pad`, `--bento-pad-tool`, `--bento-line`) und der Mono-Label-Stil (`--type-mono-label-*`). Es ändert sich keine Komponente und kein Screen.
- **Annahmen:**
  - Die Werte (Bento 12/16/24 px, Mono-Label 12/16/500/0,06 em) folgen den vorhandenen Space-Stufen und den Vorgaben im Issue (Radius 16–24 px und 2 px). Sie sind nicht aus den Figma-Seiten „Variante 2026“ gelesen: Die Knoten-IDs der Seiten sind nicht bekannt, und der Lesetoken kann Seiten nicht auflisten. Beim Abgleich mit Figma anpassen.
  - Figma ist für Agenten nur lesbar (`FIGMA_ACCESS_TOKEN`). Schritt 3 des Issues (Stilblatt-Frames in beiden Dateien aktualisieren) ist darum nicht erledigt und braucht eine Sitzung mit Schreibrechten (Sinan oder Figma-Plugin).
  - Dunkle Farben des Leitstands stehen nicht in `tokens.json` (andere Datei, keine geschätzten Werte); sie kommen mit dem Leitstand-Repo.
  - Motion ist nur erlaubt, kein Paket wird hier installiert.
- **Warum:** Eine gemeinsame, kurze Regeldatei verhindert, dass Lern-App und Leitstand auseinanderlaufen; Tokens als Variablen ohne neue Komponenten halten den Code frei von Hex-Werten und Schätzungen.
