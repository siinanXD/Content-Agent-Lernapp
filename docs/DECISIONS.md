# Architekturentscheidungen

Stand: AP-00 abgeschlossen (2026-10-02). Modellnamen und Features nur aus aktuellen Docs/Repos, nie aus dem Gedächtnis.

## Blocker / offene Secrets

| Secret | Status (2026-10-03 agent env) | Auswirkung |
| --- | --- | --- |
| Anthropic (Claude) API | **present** (`ANTHROPIC_API_KEY` + `ANTHROPIC_WORKSPACE_ID`; Console PAYG, nicht Max-Abo — D-33) | Live Messages/Batches bereit; Seed bleibt Fallback |
| OpenAI API | **present** | Richter-Modell / Evaluate live möglich |
| Langfuse (EU) | **present** | Tracing/Datasets/Prompt-Versionen live möglich |
| Supabase (EU) | **present** (`SUPABASE_URL` + service role; see D-30) | Live-Persistenz wenn Keys gesetzt; sonst mock-store |
| Railway | **present** (`RAILWAY_API_TOKEN`) | Nur für späteren Hermes-Deploy (AP-10) |
| Vercel team link | auth ok / **403** on `siinanxds-projects` | `list_teams` leer; Deploy blockiert bis Re-Auth |
| Netz Cloud-Agent (2026-10-03) | `gesetze-im-internet.de`, `kmk.org` **gesperrt** (Egress-Proxy 403) | Amtliche Quellen nur über Exa-Web-Fetch; Domains in der Umgebung freigeben |

Deckel: max. **20 € API-Kosten pro Kurslauf** (PRODUCT.md).

## Entscheidungen

### D-01 — OpenMAIC nur als Vorlage, kein Fork

- **Links:** [THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) (MIT, ~39k★, aktiv 2026-10-02); Konzept in `docs/PRODUCT.md`
- **Entscheidung:** Agenten-Aufteilung und Kurs-Idee als Inspiration; **nicht** als Code-Basis forken.
- **Warum:** Produktziel ist deutsche Ausbildungsordnungen + Duolingo-Lernpfad + eigene API-Pipeline; OpenMAIC ist Multi-Agent-Classroom, nicht IHK/AO-Pipeline.

### D-33 — AP-15 Phase A live: Console Batch only, Judge, Supabase, €20-Guard

- **Links:** Linear [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193); Anthropic Console auth / workspace header ([docs](https://platform.claude.com/docs/en/manage-claude/authentication)); Message Batches ([docs](https://platform.claude.com/docs/en/build-with-claude/batch-processing)); D-06; D-07; D-30; PR #27 (`ANTHROPIC_WORKSPACE_ID`); `scripts/ap15-phase-a.ts`; `docs/ops/AP15-PHASE-A.md`; `docs/ops/DECISIONS-D28-D33.md`
- **Entscheidung:** (1) Messages/Batch **nur über Anthropic Console API** mit `ANTHROPIC_API_KEY` + `anthropic-workspace-id` — Claude Max/Mac-Abo kann Batch/Messages **nicht** abrechnen. Fehlt der Key: stoppen und nur PRESENT/MISSING melden. (2) Phase A in Chunks zu je 2 Einheiten, `max_tokens=64000` (16k truncierte ~74/79 Requests). (3) Persistenz Supabase (`courses.lernfeld` volles JSON). (4) Richter `gpt-5.4-mini`; Regen einmal — bei Console `credit balance too low` Regen überspringen, nur Judge-Passers publishen. (5) Safety 10 %-Stichprobe vor Publish dokumentieren. (6) Kostenledger €20; Lauf ~€12.8. (7) Goldset `maf-goldset-phase-a`; Lernpfad lädt Units via `GET /api/learner/phase-a` (kein 2‑MB JSON im Repo).
- **Warum:** Max-Abo ≠ Console-Credits; ohne Workspace-Header 400; Chunk/Token-Limits sonst JSON-Truncation; Guthaben-Ende muss Pipeline graceful beenden.

### D-34 — Langfuse platform v4: JS/TS SDK v5 OTEL ingestion

- **Links:** [Upgrade to Langfuse v4](https://langfuse.com/faq/all/upgrade-to-langfuse-v4); [JS/TS v4 → v5](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5); [Custom ingestion → OTEL](https://langfuse.com/integrations/native/opentelemetry/migration-to-v4); [Deprecated API migration](https://langfuse.com/faq/all/deprecated-api-migration); D-05; D-25; Linear [SIN-197](https://linear.app/sinan-kahraman/issue/SIN-197)
- **Entscheidung:** Quality-gate Ingest migriert von raw legacy public REST ingest (`trace-create` events) auf **`@langfuse/tracing` + `@langfuse/otel` + `@langfuse/client` ≥ 5.4.0** (aktuell 5.11.1). Root-Observation trägt Input/Output; Attribute via `propagateAttributes`; Scores observation-level; Datasets über SDK. Optional `LANGFUSE_TRACING_ENVIRONMENT` / `LANGFUSE_RELEASE`. OTEL-Peers auf v2 via `package.json` `overrides` + `.npmrc` `legacy-peer-deps=true` (Koexistenz mit lighthouse→sentry OTEL v1).
- **Warum:** Langfuse Cloud schaltet Legacy-Ingest am 2026-11-16 ab; observations-first Modell braucht OTEL + propagated attributes.
