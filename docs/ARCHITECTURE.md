# Architecture

Source of truth for system shape. Product intent: `docs/PRODUCT.md`. Choices: `docs/DECISIONS.md`.

## Runtime map

```
Learner (browser)
  → Next.js App Router (Vercel)
      → Route Handlers: /api/courses... (pipeline steps)
      → Supabase EU (courses, units, progress; no PII in prompts)
      → Langfuse Cloud EU (traces, datasets, prompt versions, evals)
Claude API (Messages + Batch + web_search/web_fetch)  → generate
OpenAI API (judge structured outputs / batch)         → evaluate
Hermes Agent (Railway EU, AP-10) → weekly source check → Telegram + pipeline trigger
```

## Pipeline routes (AP-02+)

Contract: [`docs/api/openapi.yaml`](api/openapi.yaml) · Postman: [`docs/api/postman-collection.json`](api/postman-collection.json)

| Method | Path | Owner package |
| --- | --- | --- |
| POST | `/api/courses` | AP-02/03 |
| POST | `/api/courses/{id}/research` | AP-03 |
| POST | `/api/courses/{id}/plan` | AP-04 |
| POST | `/api/courses/{id}/generate` | AP-05 |
| POST | `/api/courses/{id}/evaluate` | AP-06 |
| POST | `/api/courses/{id}/publish` | AP-06 |
| POST | `/api/courses/{id}/refresh` | AP-10 (weekly) |
| POST | `/api/progress` | AP-17 (anonymous learning events) |

Storage: `getStorage()` → Supabase when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set; otherwise in-memory `mock-store` (tests / no secrets). See D-27 and `docs/ops/SUPABASE.md`.

Mocks respond with `"mock": true` until live agents replace them. Until AP-10, pipeline starts are manual.

## App screens (AP-07/08)

1. Start — keyword + learning variant
2. Path — map of units + today’s goal
3. Unit — explanation + questions
4. Result — score, streak, tomorrow
5. Profile — % progress to exam

Figma is the only source for colors, spacing, components.

## Quality gates

- OpenAI judge vs Langfuse goldset (70 MAF questions)
- axe-core + Lighthouse on every PR (must not be disabled)
- €20 API cap per course run

## Secrets (user-provided)

`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, Langfuse keys (EU), Supabase URL/keys. Without them: mocks and docs only.
