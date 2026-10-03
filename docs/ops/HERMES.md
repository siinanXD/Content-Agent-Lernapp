# AP-10 Hermes Betrieb + AP-16 Quellen-Monitor

Linear: [SIN-188](https://linear.app/sinan-kahraman/issue/SIN-188/ap-10-hermes-betrieb) · [SIN-194](https://linear.app/sinan-kahraman/issue/SIN-194/ap-16-quellen-monitor-rechtsstand-der-curriculum-maps-wochentlich) · Decision D-08 / D-22 / D-28 / D-29

## Ziel

Wöchentlicher Hermes-Agent auf **Railway EU**: Quellen-Check über alle Curriculum-Maps → bei Änderung Telegram + Linear-Issue + Map-Status „Prüfung nötig“ → selektives `POST /courses/{id}/refresh` nur für betroffene Module/Blöcke. Langfuse-Plugin für Traces.

## Status (2026-10-03)

| Item | Status |
| --- | --- |
| Scaffold / Runbook | **shipped** |
| `RAILWAY_API_TOKEN` | present in agent env |
| Live Railway deploy | **skipped** — no Telegram bot token / Hermes config injected |
| Weekly Telegram report | wired in code; blocked until `TELEGRAM_*` secrets |
| Linear issues „Quelle geändert: \<Map\>“ | wired; needs `LINEAR_API_KEY` + `LINEAR_TEAM_ID` |
| Quellen-Monitor (AP-16) | **shipped**: Lock + Skript + Unit-Tests + GitHub-Action `source-check.yml` + Hermes-Alert-Pfad |

Live Hermes is intentionally not started without Telegram secrets. Manual pipeline start remains valid (D-09). Missing Telegram/Linear secrets **never** fail the Node package — channels are skipped with a reason.

## Live path (Railway / GitHub Actions Cron)

Cloud-Agent egress blocks `gesetze-im-internet.de` and `kmk.org`. Run the live compare only on Railway or GHA:

1. `npm run content:check-sources` — sources from `loadAllCurricula()` (`docs/content/*.json`, not `docs/research/maf-sources.json`). Lock: `docs/content/sources.lock.json` (`standLabel`, ETag/Last-Modified, content hash, `checkedAt`). Also scans Aktualitätendienst + BIBB Neuordnungen via `watchKeywords`.
2. JSON report fields: `summary.changed` / `summary.unreachable` / `summary.ok`, full `diff`, `affected` (modules/blocks from `sourceIds`), `feedHits`.
3. Exit codes: **0** ok · **2** change or feed hit · **3** lock incomplete (source missing).
4. On exit 2: `npm run hermes:weekly -- report.json` (optional `--write-status`):
   - Telegram Kurzbericht (skipped if `TELEGRAM_*` absent)
   - Linear issue per map: title **`Quelle geändert: <mapId>`** (skipped if `LINEAR_API_KEY` / `LINEAR_TEAM_ID` absent)
   - Map JSON `status` → **`Prüfung nötig`** when `--write-status`
   - Prints `refreshTargets` for selective `POST /courses/{id}/refresh` with `{ mapId, sourceIds, moduleIds, blockIds }`
5. Human decides: adapt map, `content:check-sources --update`, then re-generate affected blocks. No automatic publish.
6. GitHub Action `.github/workflows/source-check.yml` — Mondays 05:17 UTC; exit 2 opens/comments a GitHub issue with label `quellen-monitor` (backup when Hermes secrets absent).

## Env (never commit)

See `docs/ops/railway.env.example` and `docs/ENV.md`.

| Variable | Role |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Hermes Telegram alert |
| `LINEAR_API_KEY` / `LINEAR_TEAM_ID` | Auto-issue „Quelle geändert: \<Map\>“ |
| `LINEAR_PROJECT_ID` | optional project attach |
| `HERMES_APP_BASE_URL` | App base for refresh API |

## Local / fixture

```bash
npm run hermes:dry-run                    # Maps + Lock, no network (seed list unused)
npm run content:check-sources:offline     # Lock coverage vs maps, no network
npm test                                  # source-watch + weekly-check fixtures
npm run content:check-sources             # Live (Railway/CI only)
npm run hermes:weekly -- report.json      # Alerts from a report (secrets optional)
```

`--update` on the check script rewrites the lock after a confirmed human review.
