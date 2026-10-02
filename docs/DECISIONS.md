# Architekturentscheidungen

Stand: AP-00 abgeschlossen (2026-10-02). Modellnamen und Features nur aus aktuellen Docs/Repos, nie aus dem Gedächtnis.

## Blocker / offene Secrets

| Secret | Status (2026-10-02 agent env) | Auswirkung |
| --- | --- | --- |
| Anthropic (Claude) API | **absent** (not in injected secrets) | Live-Recherche/Generate/Batch blockiert; MAF-Seed AO/RLP/Prüfung aktiv |
| OpenAI API | **absent** | Richter-Modell / Evaluate blockiert bis gesetzt |
| Langfuse (EU) | **absent** | Tracing/Datasets/Prompt-Versionen blockiert bis gesetzt |
| Supabase (EU) | **absent** | Persistenz live blockiert; Mocks/OpenAPI weiter möglich |
| Railway | **present** (`RAILWAY_API_TOKEN`) | Nur für späteren Hermes-Deploy (AP-10) |
| Vercel team link | auth ok / **403** on `siinanxds-projects` | `list_teams` leer; Deploy blockiert bis Re-Auth |

Deckel: max. **20 € API-Kosten pro Kurslauf** (PRODUCT.md).

## Entscheidungen

See full history D-01–D-21 on branch `cursor/ap09-a11y-offline-ff57` / prior PRs. AP-10–12 additions:

### D-22 — AP-10 Hermes: scaffold/docs only until Telegram secrets

- **Links:** [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent); Railway EU; Linear [SIN-188](https://linear.app/sinan-kahraman/issue/SIN-188/ap-10-hermes-betrieb); `docs/ops/HERMES.md`
- **Entscheidung:** Runbook + `hermes:dry-run` gegen Seed-Quellen shippen. **Kein** Live-Deploy: `RAILWAY_API_TOKEN` allein reicht nicht (Telegram-Bot/Chat + Hermes-Config fehlen). Manueller Pipeline-Start bleibt gültig (D-09).
- **Warum:** AP-10 darf ohne Ops-Secrets nicht blockieren; Entscheidung dokumentiert statt Pseudo-Telegram.

### D-23 — AP-11 Pilot: seed/fixture path without live LLM

- **Links:** Linear [SIN-189](https://linear.app/sinan-kahraman/issue/SIN-189/ap-11-pilotkurs-maf-komplett); `docs/pilot/MAF-PILOT.md`; `npm run pilot:maf`; Deckel €20/Kurslauf
- **Entscheidung:** Pilot akzeptiert den **Seed/Fixture**-Pfad (create→research→plan→generate→evaluate→publish) mit `liveLlm: false` und `estimatedCostEur: 0`. Live-Langfuse-Kosten/Bewertung folgen, sobald Keys da sind.
- **Warum:** Secrets absent; Publish-Gate und AO/RLP-Seeds decken die Pipeline-Akzeptanz für diesen Boot.

### D-24 — AP-12 Learning loop: fixture scaffold, no PII, no training

- **Links:** Linear [SIN-190](https://linear.app/sinan-kahraman/issue/SIN-190/ap-12-lern-schleife-aus-nutzungsdaten); `docs/learning/LOOP.md`; `POST /api/learning/weekly`
- **Entscheidung:** Scaffold rankt Top-5 schwache Einheiten aus Fixture-Aggregaten und schlägt Prompt-Patches vor. Kein Modell-Training; keine PII; Live-Aggregation erst nach Pilot + DSGVO-Einwilligung.
- **Warum:** SIN-190 hängt an Nutzungsdaten; ohne Traffic liefert der Scaffold die API/Regel-Form.
