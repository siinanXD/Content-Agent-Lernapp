# AP-12 Lern-Schleife (scaffold)

Linear: [SIN-190](https://linear.app/sinan-kahraman/issue/SIN-190/ap-12-lern-schleife-aus-nutzungsdaten)

## Ziel

Wöchentliche Auswertung von **aggregierten** Nutzungsdaten (ohne PII): Top-5 schwache Einheiten → Verbesserungsvorschläge → A/B Regeln zurück in Generate-Prompts. **Kein** Modell-Training.

## Status

Scaffold only. Needs post-pilot traffic + DSGVO Einwilligung before live aggregation.

## API

`POST /api/learning/weekly` — runs dry analysis on fixture usage metrics.

## Regeln

- No names, emails, device IDs, free-text answers in prompts
- Aggregate by unitId / questionId only
- Output: ranked weak units + suggested prompt patches (JSON)
