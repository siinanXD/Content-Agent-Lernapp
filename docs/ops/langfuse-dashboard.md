# Langfuse: Dashboard und Prüf-Warteschlange (SIN-299)

Einrichten (einmalig, mehrfach ausführbar; braucht `LANGFUSE_PUBLIC_KEY` und `LANGFUSE_SECRET_KEY`):

```bash
npm run langfuse:setup
```

Das legt Score-Configs, die Warteschlange „Sicherheits-Stichprobe“, die Prompts `richter-maf` und `erzeuger-maf` und das Dashboard „Kurslauf: Kosten und Qualität“ an. Meldet der Lauf „Dashboard nicht angelegt“ (die Widget-API ist bei Langfuse noch „unstable“), die Kacheln in Langfuse unter Dashboards → Widgets von Hand bauen:

| Kachel | Ansicht | Filter (Score-Name) | Gruppierung | Wert | Diagramm |
| --- | --- | --- | --- | --- | --- |
| Kosten je Kurslauf gegen den 20-Euro-Deckel | Scores numeric | `costEur`, `capEur` | Name | max | Linie über Zeit |
| Bestehensquote je Modul | Scores numeric | `Bestehensquote` | Trace-Name (enthält das Modul) | Mittel | Balken |
| Kosten je veröffentlichter Frage | Scores numeric | `Kosten je Frage (EUR)` | keine | Mittel | Zahl |
| Haiku gegen Sonnet | Scores numeric | `Kosten je Frage (EUR)` | Tags (`modell:…`) | Mittel | Balken |

Quelle der Scores: Kurslauf `scripts/content-grow.ts`, Namen in `src/lib/quality/langfuse-names.ts`.

## Kurslauf lesen

Sessions → `kurslauf-<Zeitstempel>`: alle Schritte stehen untereinander (Fragen erzeugen, Fragen prüfen, Veröffentlichen, Kosten). Filtern über Tags `modul:`, `modell:`, `schritt:`, `umgebung:`. Die Scores `Quellentreue`, `Eindeutigkeit`, `Niveau`, `Sprache` am Schritt „Fragen prüfen“ tragen die Begründung des Richter-Modells als Kommentar.

## Sicherheits-Stichprobe

1. `node --import tsx scripts/safety-sample.mjs --live --review-page --langfuse` (Live-App erreichbar, Langfuse-Keys gesetzt).
2. Langfuse → Annotation Queues → „Sicherheits-Stichprobe“: je Frage `passt`, `unklar` oder `falsch` klicken.
3. Das Urteil steht als Score `Stichprobe Sicherheit` am Trace. `falsch`-Fragen werden zurückgezogen und neu erzeugt; erst danach `content-safety` in `docs/product-readiness.json`.
