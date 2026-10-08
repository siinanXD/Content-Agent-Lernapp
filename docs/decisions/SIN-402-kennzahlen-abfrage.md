# SIN-402: Kennzahlen aus einheitlicher Quelle

**Entscheidung:** Beide Metriken-Funktionen nutzen `ratedQuestions()` zum Filtern auf existierende Fragen.

**Links:**  
- Linear: [SIN-402](https://linear.app/sinan-kahraman/issue/SIN-402)
- Vorgängerin: [SIN-394](docs/decisions/SIN-394-fragen-bewertet.md) (Nenner und Zähler aus demselben Stand)

## Ursache

Zwei Stellen berechneten „Fragen bewertet" aus unterschiedlichen Datenquellen:

| Funktion | Tabelle | Zähler |
| --- | --- | --- |
| `collectMetrics` (Planer-Bericht) | `question_quality_latest` direkt | 2121 |
| `collectContentMetrics` (Content-Abschnitt) | `question_quality_latest` gefiltert auf existierende Fragen | 0 oder weniger |

Die `question_quality_latest`-Tabelle ist append-only und enthält Bewertungen für bereits gelöschte Fragen. SIN-394 hatte dieses Problem bereits gelöst, aber nur für `collectContentMetrics`, nicht für `collectMetrics`.

## Lösung

**`scripts/autonomy/planner.mjs` (`collectMetrics`)**:
- Lade alle Fragen aus `questions` mit `fetchAll`
- Lade alle Bewertungen aus `question_quality_latest` mit `fetchAll`
- Filtere auf existierende Fragen mit der bestehenden Funktion `ratedQuestions` (aus content-metrics.mjs)
- Verwende die gefilterten Bewertungen für `fragen_bewertet` und `bestehensquote`

**`scripts/autonomy/content-metrics.mjs`**:
- Exportiere `fetchAll`, damit `collectMetrics` Pagination nutzen kann
- Kein Verhalten geändert, nur Fehlerbehandlung verbessert

**`src/lib/autonomy/content-metrics.test.ts`**:
- Neuer Test `SIN-402: passRateByModule nutzt nur gefilterte Bewertungen`: stellt sicher, dass nur existierende Fragen gezählt werden

## Akzeptanzkriterien ✓

- [x] Content-Abschnitt und Kennzahl nennen dieselbe Zahl bewerteter Fragen
- [x] Bestehensquote je Modul wird ausgegeben, sobald Bewertungen vorliegen; die schwächsten Module stehen zuerst
- [x] Unit-Test mit Beispieldaten deckt Zähler, Nenner und Modul-Gruppierung ab
- [x] Ursache steht als eine Zeile in docs/autonomy/LEHREN.md

## Annahmen

- Fragen-IDs sind eindeutig mit (course_id, unit_id)
- Evaluationen sind append-only und werden nie aus der DB entfernt
- Beide Funktionen nutzen dieselbe `ratedQuestions`-Filterfunktion
- Beide Abfragen sortieren jetzt (`order=course_id,unit_id,…`), damit die Seiten von `fetchAll` (Range je 1000) stabil sind.
- Der Wert 0 im Content-Abschnitt ließ sich ohne Live-Zugang nicht nachstellen. Zeigt der nächste Lauf weiter 0, liegt es an den Schlüsseln (course_id/unit_id/question_id) und braucht ein Folge-Issue.
