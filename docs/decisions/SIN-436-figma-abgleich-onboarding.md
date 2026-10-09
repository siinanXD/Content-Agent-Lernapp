# SIN-436 — Abgleich mit Figma: Willkommen, Einwilligung, Schwerpunkt, Lernpfad

- **Links:** Linear [SIN-436](https://linear.app/sinan-kahraman/issue/SIN-436/abgleich-mit-figma-willkommen-einwilligung-schwerpunkt-und-lernpfad-w1), SIN-315 (ohne Figma gebaut), `docs/design/FIGMA.md`. Figma-Knoten W1 `56:369`, W2 `56:381`, W3 `56:401`, A1 `52:377`.
- **Entscheidung:** Die vier Seiten folgen den Figma-Knoten in Aufbau, Abständen, Texten und Tokens. Nur vorhandene Tokens und Komponenten; `DailyGoal` bekommt die Variante `vertical`. E2E-Tests und `live/live.spec.ts` sind an die neuen Knopf- und Überschriftentexte angepasst (Ablehnen, Lernpfad erstellen, Begrüßung).
- **Annahmen / Abweichungen von Figma:**
  - W2: Kachel „Quellen und KI“ und der Link „Datenschutz“ bleiben zusätzlich zu Figma, damit KI-Hinweis und Informationspflicht vor der Entscheidung sichtbar sind.
  - A1: Knopf in „Als Nächstes“ auf `brand/accent` mit dunklem Text (AGENTS.md: weißer Text nur auf `brand/primary`).
  - Begrüßung und Wochentag kommen aus der Browser-Uhrzeit (`begruessung.ts`); vor dem Laden steht „Hallo“.
- **Warum:** SIN-315 entstand ohne lesbares Figma; Figma ist die einzige Quelle für Werte.
