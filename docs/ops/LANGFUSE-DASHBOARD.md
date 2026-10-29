# Langfuse: Dashboard und Prüf-Warteschlange (SIN-299)

Einrichten (einmalig, mehrfach ausführbar; braucht `LANGFUSE_PUBLIC_KEY` und `LANGFUSE_SECRET_KEY`):

```bash
npm run langfuse:setup
```

Das legt Score-Configs, die Warteschlange „Sicherheits-Stichprobe“, die Prompts `richter-maf` und `erzeuger-maf` und das Dashboard „Kurslauf: Kosten und Qualität“ an. Meldet der Lauf „Dashboard nicht angelegt“ (die Widget-API ist bei Langfuse noch „unstable“), die Kacheln in Langfuse unter Dashboards → Widgets von Hand bauen:

| Kachel | Ansicht | Filter (Score-Name) | Gruppierung | Wert | Diagramm |
| --- | --- | --- | --- | --- | --- |
| Kosten je Kurslauf gegen den 20-Euro-Deckel | Scores numeric | `costEur`, `capEur` | Name | max | Linie über Zeit |
| Bestehensquote je Lauf | Scores numeric | `bestanden` | Session | Mittel | Balken |
| Kosten je veröffentlichter Frage | Scores numeric | `Kosten je Frage (EUR)` | keine | Mittel | Zahl |
| Haiku gegen Sonnet | Scores numeric | `Kosten je Frage (EUR)` | Tags (`modell:…`) | Mittel | Balken |

Quelle der Scores: Kurslauf `scripts/content-grow.ts`, Namen in `src/lib/quality/langfuse-names.ts`.

## Kurslauf lesen

Sessions → `kurslauf-<Zeitstempel>`: ein Trace je Einheit (`M3 · 02 Spannmittel`), dazu „Veröffentlichen“ und „Kosten“. Im Einheiten-Trace stehen „Erzeugen“ (Modell, Tokens, Kosten, Prompt-Auszug, erzeugte Fragen), je Frage „Prüfen · Frage n“ und „Ergebnis“. Filtern über Tags `modul:`, `lauf:`, `modell:`, `umgebung:`. An der Frage hängen nur die Scores `Sicherheit` und `bestanden` (mit der Begründung des Richter-Modells als Kommentar). `Quellentreue`, `Eindeutigkeit`, `Niveau` und `Sprache` stehen als Metadaten an „Prüfen · Frage n“ und in `question_evaluations`; im Dashboard gibt es dafür keine Kachel mehr, weil jeder Score eine Langfuse-Unit kostet (SIN-1191, `docs/decisions/SIN-1191-langfuse-scores.md`). Die vier Prüfpunkte schreibt nur noch der Richter-Lauf (`evaluate-agent.ts`) als Mittelwert je Lauf.

## Sicherheits-Stichprobe

1. `node --import tsx scripts/safety-sample.mjs --live --review-page --langfuse` (Live-App erreichbar, Langfuse-Keys gesetzt).
2. Langfuse → Annotation Queues → „Sicherheits-Stichprobe“: je Frage `passt`, `unklar` oder `falsch` klicken.
3. Das Urteil steht als Score `Stichprobe Sicherheit` am Trace. `falsch`-Fragen werden zurückgezogen und neu erzeugt; erst danach `content-safety` in `docs/product-readiness.json`.
