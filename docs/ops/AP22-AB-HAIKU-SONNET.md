# AP-22 — A/B Haiku 4.5 vs Sonnet 5.5 (SIN-219)

**Status: Messung ausstehend.** Im Agent-Lauf fehlten `ANTHROPIC_API_KEY` und `OPENAI_API_KEY` (beide MISSING). Es wurde **kein** Live-Batch gestartet und es gibt **keine** Messwerte. Zahlen unten sind Preise aus den Docs und eine Vorab-Schätzung, keine Ergebnisse.

## Aufbau

- 20 Einheiten aus `LF3` (10 Batch-Chunks à 2 Einheiten, `LF3-1` ff.), `docs/content/maf-metall.json`.
- Gleiche Prompts (`chunkPrompt`) und gleicher System-Präfix (Didaktik-Regeln + Schema) mit `cache_control: ephemeral` für beide Modelle.
- Richter `gpt-5.4-mini` (`JUDGE_PROMPT_VERSION` 2026-10-v1), dieselbe Schwelle wie Phase A (`scoresPass`). Goldset-Kalibrierung des Richters: `docs/quality/calibration.json`.
- Gemessen wird `usage` je Batch-Ergebnis: `input`, `output`, `cache_creation_input_tokens`, `cache_read_input_tokens`.
- Es wird nichts veröffentlicht oder in Supabase geschrieben; durchgefallene Einheiten bleiben im JSON-Bericht.
- Abbruch: Preflight über €3, oder gemessene Kosten über €3 nach der Generierung.

## Modell-IDs und Preise (offiziell, geprüft 2026-10-05)

Quelle: [Pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing).

| Modell | ID | Batch Eingabe | Batch Ausgabe | Cache-Schreiben 5 min | Cache-Lesen |
| --- | --- | --- | --- | --- | --- |
| Sonnet 5.5 | `claude-sonnet-5-5` | $1 / MTok | $5 / MTok | 1,25× Eingabe | 0,1× Eingabe |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | $0,50 / MTok | $2,50 / MTok | 1,25× Eingabe | 0,1× Eingabe |

Haiku 4.5 kostet pro Token die Hälfte von Sonnet 5.5. Ob das reicht, hängt davon ab, wie viele Einheiten die Qualitäts-Schwelle bestehen; deshalb zählt am Ende **Euro je bestandene Einheit**.

## Vorab-Schätzung

Annahme ~3 000 Input- und ~4 000 Output-Token je Einheit, ~7 Fragen je Einheit im Judge: ca. **$1,2** für beide Modelle plus Richter (Budget €3). Ohne Caching-Treffer; der Präfix ist kurz und liegt womöglich unter der Mindestlänge für Caching, dann bleibt `cache_read_input_tokens` 0. Das zeigt erst der Lauf.

## Lauf

```bash
export ANTHROPIC_API_KEY=… ANTHROPIC_WORKSPACE_ID=… OPENAI_API_KEY=…
npm run lock:assemble && npm ci
npm run ap22:ab:dry   # Vorprüfung, keine API-Kosten
npm run ap22:ab       # schreibt docs/ops/ap22-runs/<runId>-ab-report.json
```

## Ergebnis (nach dem Lauf ausfüllen)

| | Haiku 4.5 | Sonnet 5.5 |
| --- | --- | --- |
| Einheiten erzeugt / bestanden | – | – |
| Frage-Bestehensquote | – | – |
| Scores (Quelle, Korrektheit, Niveau, Sprache) | – | – |
| input / output Token | – | – |
| cache_creation / cache_read Token | – | – |
| Generierung USD | – | – |
| USD je bestandene Einheit | – | – |

Gesamtkosten: – (Budget €3).

## Entscheidungsregel

Gewinner = günstigstes Modell, dessen Bestehensquote die Schwelle aus D-33 hält (AGENTS.md: günstigstes Modell, das die Qualitäts-Schwelle besteht). Danach `GENERATOR_MODEL` in Vercel/Railway setzen und D-41 ergänzen. Bis dahin gilt der Default `claude-sonnet-5-5`.
