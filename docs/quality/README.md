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

## Phase A goldset (AP-15)

`docs/quality/maf-goldset-phase-a.json` — 70 AO/BIBB items **plus** ≥5 own items per module `M0`, `LF1`, `LF2`, `PA` (dataset name `maf-goldset-phase-a`). Module baselines: `docs/quality/module-targets-phase-a.json`.

## Modellvergleiche in Langfuse (SIN-448)

`ab-haiku-sonnet` und `ab-alle-modelle` schreiben je Modell und Einheit einen Trace im Format der Fabrik (Erzeugen mit Modell, Tokens, Kosten; jede Frage mit Bewertung; Ergebnis). Session `vergleich-<runId>`, Tags `lauf:Modellvergleich` und `modell:<id>`. Bewertung vor der Reparatur; bei `ab-alle-modelle` die kombinierte Bewertung beider Richter. Tokens und Kosten sind je Modell gleichmäßig auf die Einheiten verteilt. Ohne `LANGFUSE_*` wird nichts geschrieben, der Lauf läuft weiter.

## Goldset Industriekaufleute (SIN-447)

`docs/quality/indkfl-goldset.json` — **35 eigene Fragen**, Status **geprüft durch Sinan am 09.10.2026**:

- 12 Fragen zu Verordnung und Prüfung ([IndKflAusbV](https://www.gesetze-im-internet.de/indkflausbv/BJNR05E0A0024.html), §§ 4, 8, 11, 12, 14)
- je 5 Fachfragen zu Phase A: `M0` (Anlage, Abschnitt B), `LF1`, `LF2`, `LF3` ([KMK-Rahmenlehrplan 15.12.2023](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriekaufleute_2023-12-15-mitEL.pdf)); `unitId` ist der Block der Map
- 3 Gegenproben (Feld `gegenprobe`): falsche Zahl (Quellentreue 0), mehrere richtige Antworten (Eindeutigkeit 0), zu leicht und unsauber (Niveau und Sprache unter 4). Der Richter muss sie durchfallen lassen.

Quellen nur aus `docs/content/indkfl.json` (abgerufen 2026-10-03), keine IHK-Prüfungsaufgaben, keine Personendaten. Lader: `src/lib/quality/indkfl-goldset.ts`, Langfuse-Datensatz `indkfl-goldset` (noch nicht angelegt). Tests prüfen Quellen, Abdeckung, Sicherheitsmerkmal und Gegenproben.

## Commands

```bash
npm run quality:sync-goldset   # upsert 70 items into Langfuse
npm run quality:calibrate      # OpenAI judge → GOLDSET_TARGET + Langfuse dataset
npm run quality:smoke          # live evaluate + 409/422/200 publish gate
npm run ap15:phase-a:dry       # secret + chunk preflight (no spend)
npm run ap15:phase-a           # live Phase A Batch → judge → Supabase publish
```
