# Größen der Issues (SIN-320)

Der Planer setzt je Issue genau ein Label `groesse:klein`, `groesse:mittel` oder `groesse:gross` (Design-Pakete haben keins). Ohne Label gilt `mittel`. Sie steuern Modell, Runden-Deckel und Bündeln. Code: `scripts/autonomy/sparen.mjs`.

| Größe | Kriterien | Modell | `--max-turns` |
| --- | --- | --- | --- |
| `klein` | 1–2 Dateien, kein neues Verhalten, keine neue Abhängigkeit: Doku, Texte, Labels, Index, Konfigurationswert, einzelner Testfall | `claude-haiku-4-5-20251001` | 30 |
| `mittel` | Ein Arbeitspaket mit klaren Kriterien: neue Funktion in einem Bereich, Skript mit Test, Workflow-Schritt, einzelne Seite aus vorhandenen Komponenten | `claude-sonnet-5-5` | 80 |
| `gross` | Mehr als ein PR nötig: mehrere Bereiche, Migration plus UI plus Pipeline, neue Integration | `claude-sonnet-5-5` | 150 |

## Regeln

- **Große Aufträge werden vor dem Start geteilt.** Der Planer teilt selbst in mittlere oder kleine Einträge (Blocker-Reihenfolge). Ein Planer-Eintrag mit `size: gross` wird verworfen. Ein gestarteter Auftrag, der ohne PR an die Zug-Grenze stößt, wird wie bisher in Teil-Issues zerlegt (SIN-291).
- **Haiku nur für `klein`.** Liefert der Haiku-Lauf keinen PR (und ist es kein Limit), startet derselbe Worker-Lauf einen zweiten Versuch mit Sonnet (80 Runden). Wird CI nach einem Haiku-PR rot, repariert `repair.yml` ohnehin mit Sonnet.
- **Bündeln.** Mehrere `klein`-Issues desselben Bereichs startet der Dispatcher als **einen** Lauf mit **einem** PR (höchstens 4). Bereich = Label `bereich:<name>` (der Planer setzt es für Kleinkram, z. B. `bereich:doku`), sonst die Spur (frontend, content, backend). Ein gebündelter Lauf zählt für die Größe als das größte seiner Issues. Der PR-Titel nennt alle Kennungen, beim Merge gehen alle auf Done.
- **Keine KI für Mechanik.** Index neu erzeugen (`npm run decisions:index`), Konflikte in erzeugten Dateien, Labels und Changelog erledigen Skripte, nie ein Claude-Lauf (SIN-312).

## Verbrauch

Nach jedem Worker- und Repair-Lauf liest `scripts/autonomy/verbrauch.mjs` das Ergebnis von claude-code-action (Tokens Eingabe/Ausgabe/Cache, Runden, Dauer, API-Gegenwert) und

- hängt eine Zeile unter `## Verbrauch` an den PR-Text (der Steckbrief zeigt sie unter „Verbrauch“),
- schreibt einen Kommentar ans Linear-Issue (nur im Worker),
- liefert dem Tages-Update die Wochensumme, Tokens und Gegenwert je gemergtem PR und die „Teuersten 3“ (aus den Merkern `<!-- usage: … -->` in den PR-Texten).

Der API-Gegenwert ist nur eine Rechengröße (`total_cost_usd`), im Max-Abo fällt er nicht an. Vergleich vorher/nachher: Die Messung beginnt mit diesem PR; nach einer Woche stehen „Tokens je gemergtem PR“ im Tages-Update, die Zeit davor hat keine Messwerte.
