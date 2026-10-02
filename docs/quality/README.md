# AP-06 Quality gate (Langfuse)

## Thresholds (PRODUCT.md)

| Check | Threshold |
| --- | --- |
| sourceFidelity | 1 (hard) |
| uniqueness | 1 (hard) |
| niveau | ≥ 4 / 5 |
| language | ≥ 4 / 5 |
| safetyFlag | human sample when true |

## Offline fixture

`src/lib/quality/maf-goldset-fixture.ts` — 12 sample MAF items (incl. intentional fails `g11` uniqueness, `g12` source fidelity). Stand-in until the full 70 Online-Lerncampus goldset is loaded into Langfuse EU.

## Modes

1. **fixture** — no OpenAI key; heuristic/gold expected scores
2. **live** — `OPENAI_API_KEY` → `gpt-5.4-mini` structured judge
3. **langfuse-offline** — fixture scores + Langfuse ingest when `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` set (`LANGFUSE_BASE_URL` default `https://cloud.langfuse.com`)

## API

- `POST /api/courses/{id}/evaluate` → scores + per-question results
- `POST /api/courses/{id}/publish` → **409** if not evaluated; **422** if below threshold
