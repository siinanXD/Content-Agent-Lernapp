# AP-06 Quality gate (Langfuse EU)

## Langfuse v4 / SDK v5

Tracing uses **JS/TS SDK v5** (`@langfuse/tracing`, `@langfuse/otel`, `@langfuse/client` ≥ **5.4.0** / current **5.11.1**) with OpenTelemetry export to Langfuse Cloud EU. Legacy `POST /api/public/ingestion` trace events are not used (see [upgrade to v4](https://langfuse.com/faq/all/upgrade-to-langfuse-v4), [JS/TS v4 → v5](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5), [custom ingestion migration](https://langfuse.com/integrations/native/opentelemetry/migration-to-v4)).

- Root observation carries overall evaluate input/output.
- Correlating attributes (`tags`, `metadata`, `traceName`) via `propagateAttributes`.
- Scores via `LangfuseClient.score` (observation-level).
- Goldset via `api.datasets` + `dataset.createItem` / `dataset.get`.
- Next.js registers the processor in `src/instrumentation.ts`.

## Thresholds (PRODUCT.md)

Hard publish gate (blocks `/publish`):

| Check | Threshold |
| --- | --- |
| sourceFidelity | 1 (hard) |
| uniqueness | 1 (hard) |
| niveau | ≥ 4 / 5 |
| language | ≥ 4 / 5 |
| safetyFlag | human sample when true |

Calibrated goldset baseline (`docs/quality/calibration.json`, OpenAI `gpt-5.4-mini`, 2026-10-02): 45/70 items passed; averages on passers `niveau=4`, `language=4.9`. The 4.9 language figure is a baseline, **not** the 422 floor — otherwise most live content would fail.

## Goldset

`docs/quality/maf-goldset-70.json` — **70 original** MAF practice items citing [MaschFüAusbV](https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html), [§ 8](https://www.gesetze-im-internet.de/maschf_ausbv/__8.html), [§ 9](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html), [BIBB 51121](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121). Retrieved **2026-10-02**. **No IHK exam copies.**

Langfuse dataset name: `maf-goldset-70` (Langfuse Cloud EU).

`src/lib/quality/maf-goldset-fixture.ts` keeps 12 samples including intentional fails `fx-unique`/`fx-source` for unit tests.

## Modes

1. **fixture** — no OpenAI key; heuristic/gold expected scores
2. **live** — `OPENAI_API_KEY` → `gpt-5.4-mini` structured judge (D-07); traces/scores in Langfuse when `LANGFUSE_*` set
3. **langfuse-offline** — fixture scores + Langfuse ingest when keys set but OpenAI absent

## API

- `POST /api/courses/{id}/evaluate` → scores + per-question results
- `POST /api/courses/{id}/publish` → **409** if not evaluated; **422** if below threshold; **200** if passed

## Commands

```bash
npm run quality:sync-goldset   # upsert 70 items into Langfuse
npm run quality:calibrate      # OpenAI judge → GOLDSET_TARGET + Langfuse dataset
npm run quality:smoke          # live evaluate + 409/422/200 publish gate
```
