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

### D-33 — Pipeline billing: Claude Console API + Workspace; nicht Claude Mac/Max-Abo

- **Links:** [Claude API auth](https://platform.claude.com/docs/en/api/overview) (`x-api-key`, `anthropic-workspace-id`); [Claude Code + Pro/Max](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan) (`ANTHROPIC_API_KEY` → API-Rates, nicht Abo-Pool); [Message Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing); `docs/ENV.md`; `src/lib/anthropic/headers.ts`; Linear [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193) (AP-15); D-06
- **Entscheidung:** Research/Plan/Generate (Messages + Message Batches, Modell `claude-sonnet-5-5`) authentifizieren ausschließlich über **Claude Console** Secrets `ANTHROPIC_API_KEY` + optional/empfohlen `ANTHROPIC_WORKSPACE_ID` (Header über `anthropicHeaders`). **Claude Desktop / Pro / Max Subscription-OAuth** ist kein Auth-Pfad für Cloud-Agents oder die Next.js-Pipeline und deckt Batch-Kosten nicht ab. Self-hosted Mac-Worker ändert die Billing-Logik nicht. AP-15 Phase A bleibt Batch auf Console-Credits unter dem €20-Deckel.
- **Warum:** Anthropic trennt Abo-Pool (Claude.app / Claude Code Login) und Console-PAYG; Cloud-VMs haben kein Desktop-OAuth (`~/.claude` fehlt); die App spricht die öffentliche API, nicht die Mac-App.
