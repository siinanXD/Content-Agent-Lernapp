# AP-10 Hermes Betrieb (scaffold)

Linear: [SIN-188](https://linear.app/sinan-kahraman/issue/SIN-188/ap-10-hermes-betrieb) · Decision D-08 / D-22

## Ziel

Wöchentlicher Hermes-Agent auf **Railway EU**: Quellen-Check → Pipeline per API anstoßen → Telegram-Meldung. Langfuse-Plugin für Traces.

## Status (2026-10-03)

| Item | Status |
| --- | --- |
| Scaffold / Runbook | **shipped** |
| `RAILWAY_API_TOKEN` | present in agent env |
| Live Railway deploy | **skipped** — no Telegram bot token / Hermes config injected |
| Weekly Telegram report | blocked until secrets |
| Quellen-Monitor (AP-16, [SIN-194](https://linear.app/sinan-kahraman/issue/SIN-194)) | **shipped** als Skript + Lock + GitHub-Action `source-check.yml` (montags, Issue bei Treffer); Telegram-Meldung folgt mit Hermes |

Live Hermes is intentionally not started. Manual pipeline start remains valid (D-09).

## Geplanter Wochenjob

1. `npm run content:check-sources` — Quellen aller Maps aus `docs/content/*.json`, Versionsmarker aus `docs/content/sources.lock.json` (Stand-Zeile gesetze-im-internet.de, KMK-Beschlussdatum, ETag/Last-Modified/Hash). Scannt zusätzlich den Aktualitätendienst (BGBl.) und die BIBB-Seite „Neuordnungen“ nach den `watchKeywords`.
2. Exit 0 → nur Langfuse-Trace und eine OK-Zeile. Exit 2 → Telegram-Kurzbericht: geänderte Quelle, alter/neuer Stand, betroffene Module und Blöcke je Map (`affected` im Report). Exit 3 → Lock unvollständig, Issue in Linear.
3. Nach Exit 2 entscheidet ein Mensch: Map im Builder anpassen, Markdown rendern, `--update` für den Lock, PR. Erst dann Pipeline für die betroffenen Blöcke neu anstoßen (research → plan → generate → evaluate → publish, gleicher Vertrag wie OpenAPI). Kein automatisches Publish.
4. Langfuse: session/trace when `LANGFUSE_*` present.

## Env (never commit)

See `docs/ops/railway.env.example`.

## Local dry-run

```bash
npm run hermes:dry-run                    # Quellen der Maps + Lock-Stand, ohne Netz
npm run content:check-sources:offline     # Abdeckung Lock vs. Maps, ohne Netz
npm run content:check-sources             # Live-Vergleich (Railway/CI, nicht im Cloud-Agent)
```

`hermes:dry-run` zeigt die geplante Prüfung über alle Quellen der Curriculum-Maps, ohne Hermes zu deployen oder Telegram zu rufen.
