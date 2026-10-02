# AP-10 Hermes Betrieb (scaffold)

Linear: [SIN-188](https://linear.app/sinan-kahraman/issue/SIN-188/ap-10-hermes-betrieb) · Decision D-08 / D-22

## Ziel

Wöchentlicher Hermes-Agent auf **Railway EU**: Quellen-Check → Pipeline per API anstoßen → Telegram-Meldung. Langfuse-Plugin für Traces.

## Status (2026-10-02)

| Item | Status |
| --- | --- |
| Scaffold / Runbook | **shipped** |
| `RAILWAY_API_TOKEN` | present in agent env |
| Live Railway deploy | **skipped** — no Telegram bot token / Hermes config injected |
| Weekly Telegram report | blocked until secrets |

Live Hermes is intentionally not started. Manual pipeline start remains valid (D-09).

## Geplanter Wochenjob

1. Fetch seed source URLs from `docs/research/maf-sources.json` (ETags / last-modified).
2. If changed → `POST /api/courses` + research → plan → generate → evaluate → publish (same contract as OpenAPI).
3. Telegram: Kurzbericht (geänderte Quellen, gate pass/fail, approx. Kosten).
4. Langfuse: session/trace when `LANGFUSE_*` present.

## Env (never commit)

See `docs/ops/railway.env.example`.

## Local dry-run

```bash
npm run hermes:dry-run
```

Prints the planned check against seed sources without deploying Hermes or calling Telegram.
