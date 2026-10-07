# SIN-326: Variante 2026 · 4/4: Ergebnis, Zustände, Tastatur über alle Fragetypen

- **Links:** Linear [SIN-326](https://linear.app/sinan-kahraman/issue/SIN-326), [SIN-316](https://linear.app/sinan-kahraman/issue/SIN-316), [SIN-323](https://linear.app/sinan-kahraman/issue/SIN-323); Figma [Lern-App](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz); Regeln `docs/design/regeln-2026.md` §1, §2
- **Entscheidung:** Das Ergebnis (`/ergebnis`) nutzt die Hauptkachel `Tile tone="hero"` statt des Farbverlaufs. Ohne gespeichertes Ergebnis zeigt die Seite „Noch kein Ergebnis“ statt der bisherigen Standardwerte (5 von 6, 120 Punkte). Ist Serie und Tagesziel nicht lesbar, erscheint der Fehlerzustand (`StateView kind="fehler"`). Laden (`/einheit`), Fehler (`error.tsx`) und offline (Hinweis in der Einheit) bestanden schon und bleiben. Der neue Test `e2e/fragetypen-tastatur.spec.ts` beantwortet alle 5 Fragetypen nur mit der Tastatur.
- **Annahmen:**
  - Figma nicht gelesen (wie in SIN-323: Knoten-IDs unbekannt, Seite „Variante 2026“ nicht auflistbar). Aufbau nach Regeln 2026; beim Abgleich anpassen.
  - Die Hero-Kachel trägt keine Aktion; die Aktionen stehen darunter, damit keine neue Button-Variante auf dunklem Grund nötig ist.
  - Zuordnen wird per Auswahlfeld (Pfeiltasten), Reihenfolge per Hoch/Runter-Buttons bedient; das ist tastaturtauglich, Ziehen gibt es nicht.
- **Warum:** Erfundene Standardzahlen und ein Verlauf widersprechen Anti-Slop (AGENTS.md); der Test sichert die Tastaturbedienung gegen Rückfälle.
