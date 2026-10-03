# Content-Agent-Lernapp

Lern-App, die aus einem Schlagwort (z. B. Ausbildungsberuf) einen prüfungsnahen Kurs erzeugt: Recherche amtlicher Quellen → Plan → Generate → Quality-Gate → Publish.

Produktregeln: [`docs/PRODUCT.md`](docs/PRODUCT.md). Architekturentscheidungen: [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Stack (kurz)

| Schicht | Wahl |
| --- | --- |
| App | Next.js (App Router) + TypeScript auf Vercel |
| UI | shadcn/ui |
| Daten | Supabase EU (bevorzugt Frankfurt) |
| Generator | Claude Sonnet 5.5 (+ Batch); Haiku nur nach Gate |
| Judge | OpenAI `gpt-5.4-mini` |
| Observability | Langfuse Cloud **EU**, **platform v4** via **JS/TS SDK v5** (`@langfuse/tracing` / `@langfuse/otel` / `@langfuse/client`, OTLP) |
| Ops (später) | Hermes Agent auf Railway |

## Lokal

```bash
npm install
npm run dev
```

Env-Namen und Secrets-Status: [`docs/ENV.md`](docs/ENV.md) (keine Werte committen).

```bash
npm test                 # unit (node:test)
npm run test:a11y        # axe + Lighthouse CI (Chrome)
npm run quality:smoke    # live evaluate + publish gate (needs OPENAI + LANGFUSE)
```

## API (MVP)

OpenAPI: [`openapi/openapi.yaml`](openapi/openapi.yaml)

- `POST /api/courses` — Kurs anlegen
- `POST /api/courses/{id}/research|plan|generate|evaluate|publish`
- `GET /api/courses/{id}` — Status

Ohne `SUPABASE_*`: In-Memory-Store (Dev). Ohne Modell-Keys: Fixture-/Seed-Pfade wo vorgesehen.

## Qualität

Hard-Gate vor Publish (PRODUCT): `sourceFidelity=1`, `uniqueness=1`, `niveau≥4`, `language≥4`. Details: [`docs/quality/README.md`](docs/quality/README.md).

## Lizenz / Inhalt

Keine IHK-Originalprüfungen. Inhalte aus Ausbildungsordnung, Rahmenlehrplan und öffentlichen Quellen mit Link + Abrufdatum.
