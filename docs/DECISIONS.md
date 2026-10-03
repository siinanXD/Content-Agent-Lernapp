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

### D-02 — Keine brauchbaren DE-Berufsbildungs-Datensätze auf Hugging Face als Inhaltsquelle

- **Links:** HF-Suchen `berufsbildung` / `ausbildung deutschland` / `german vocational` / `Rahmenlehrplan` / `berufsschule` → leer oder irrelevant; Treffer wie [SkillSprinters/ihk-pruefungsstruktur-wirtschaftsfachwirt-2026](https://huggingface.co/datasets/SkillSprinters/ihk-pruefungsstruktur-wirtschaftsfachwirt-2026) (Struktur, nicht MAF-Inhalt); BIBB-ähnliche Treffer sind andere Domains
- **Entscheidung:** Inhalte nur aus **amtlichen Quellen** per Web-Search/Web-Fetch (Ausbildungsordnung, Rahmenlehrplan, Prüfungsanforderungen) mit gespeichertem Link + Abrufdatum; **keine** IHK-Originalprüfungen.
- **Warum:** Kein HF-Datensatz deckt MAF/amtliche Lernfelder belastbar ab; Urheberrecht verbietet IHK-Aufgabenkopien (`docs/PRODUCT.md`).

### D-03 — App: Next.js auf Vercel + shadcn/ui

- **Links:** [Next.js Docs](https://nextjs.org/docs); [Vercel Next.js](https://vercel.com/docs/frameworks/nextjs); [shadcn/ui](https://ui.shadcn.com/docs)
- **Entscheidung:** TypeScript Next.js App Router auf Vercel; UI-Primitives über shadcn/ui.
- **Warum:** Entspricht PRODUCT.md; offizieller Deploy-Pfad; weniger Eigenbau bei a11y-fähigen Komponenten.

### D-04 — Daten: Supabase EU (Frankfurt bevorzugen)

- **Links:** [Supabase Regions](https://supabase.com/docs/guides/platform/regions) (`eu-central-1` Central EU Frankfurt; weitere EU: Ireland/London/Paris/Stockholm/Zurich)
- **Entscheidung:** Supabase-Projekt in **EU**, bevorzugt **Frankfurt (`eu-central-1`)** für DE/NRW-Nähe.
- **Warum:** DSGVO/Hosting-EU laut PRODUCT.md; Region ist Datenort-Kontrolle, kein Compliance-Nachweis allein.

### D-05 — Observability: Langfuse Cloud EU

- **Links:** [Langfuse Data Regions](https://langfuse.com/security/data-regions.md) — EU region Ireland (AWS `eu-west-1`); [Datasets/Experiments](https://langfuse.com/docs/evaluation/overview.md); [Prompt Management](https://langfuse.com/docs/prompt-management/overview) (via Docs-Index)
- **Entscheidung:** Langfuse Cloud **EU**-Region; Goldset der 70 MAF-Fragen als Dataset; Prompt-Versionierung + Schwellen in Langfuse.
- **Warum:** PRODUCT.md verlangt EU; Trennung von US-Region ist hart (neuer Account bei Wechsel).

### D-06 — Erzeuger-Modell: Claude Sonnet 5.5 (+ Batch); Haiku nur wenn Schwelle hält

- **Links:** [Models overview](https://platform.claude.com/docs/en/models/overview); [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) ID `claude-sonnet-5-5` ($2/$10 MTok); [Claude Haiku 4.5](https://platform.claude.com/docs/en/models/haiku-4-5/overview) ID `claude-haiku-4-5` / `claude-haiku-4-5-20251001` ($1/$5); [Batch 50%](https://platform.claude.com/docs/en/build-with-claude/batch-processing); [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs); [Web search $10/1k](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool); [Web fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool); [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Entscheidung:** Default-Generator **`claude-sonnet-5-5`** (Recherche mit web_search/web_fetch, Plan/Generate mit structured outputs); Massen-Generate über **Message Batches API**; günstigeres **`claude-haiku-4-5`** erst nach Langfuse-Schwelle (AP-06) freischalten.
- **Warum:** Günstigstes Modell, das die Qualitäts-Schwelle bestehen soll — Sonnet ist der dokumentierte Speed/Intelligence-Sweet-Spot; Opus/Fable teurer ohne nachgewiesenen Mehrwert für Kurs-JSON; Batch senkt Tokenkosten um 50 %.

### D-07 — Richter-Modell: OpenAI `gpt-5.4-mini` (unabhängige Familie)

- **Links:** [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini) ID `gpt-5.4-mini` ($0.75/$4.5 MTok); [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs); [Batch](https://developers.openai.com/api/docs/guides/batch); Alternative günstiger: [gpt-5-mini](https://developers.openai.com/api/docs/models/gpt-5-mini) ($0.25/$2)
- **Entscheidung:** Judge/Evaluate mit **`gpt-5.4-mini`** + Structured Outputs (+ Batch wo asynchron ok). Nach Goldset-Kalibrierung (AP-06) ggf. auf **`gpt-5-mini`** senken, wenn Schwelle hält.
- **Warum:** PRODUCT.md verlangt zweite Modellfamilie; Mini-Klasse hält den €20-Deckel; 5.4-mini ist laut Docs das stärkere Mini für hohe Volumen/Subagents.

### D-08 — Hermes Agent auf Railway für Wochen-Betrieb; nicht Claude Managed Agents für die Content-Pipeline

- **Links:** [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (MIT, aktiv); [Hermes README / Telegram Gateway](https://github.com/NousResearch/hermes-agent/blob/main/README.md); [Hermes Langfuse Plugin Docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/built-in-plugins#observabilitylangfuse); [Langfuse ↔ Hermes](https://langfuse.com/integrations/other/hermes); [Railway Hermes template](https://github.com/praveen-ks-2001/hermes-agent-template) (316★, aktuell, Lizenz unklar → nur Deploy-Hilfe, kein Fork-Zwang); [Claude Managed Agents overview (beta `managed-agents-2026-04-01`)](https://platform.claude.com/docs/en/managed-agents/overview); [Scheduled deployments](https://platform.claude.com/docs/en/managed-agents/scheduled-deployments); [Session budgets](https://platform.claude.com/docs/en/managed-agents/budgets); [Managed Agents pricing: kein Batch-Rabatt + Session-Runtime](https://platform.claude.com/docs/en/about-claude/pricing#claude-managed-agents-pricing)
- **Entscheidung:** **AP-10 = Hermes Agent** (Telegram-Meldungen, wöchentlicher Quellen-Check, Pipeline per API anstoßen) auf **Railway EU**; Content-Pipeline bleibt **Messages API + eigene Route Handlers** (Batch möglich). Claude Managed Agents **nicht** als Pipeline-Runtime; optional später nur evaluieren, wenn Hermes-Ops zu teuer/instabil wird.
- **Warum:** Weniger Abhängigkeiten + Batch-50 % für Generate; Hermes hat natives Telegram + gebündeltes Langfuse-Plugin; Managed Agents sind Beta und berechnen Session-Runtime ohne Batch-Discount.

### D-09 — Bis AP-10 manueller Pipeline-Start

- **Links:** `docs/PRODUCT.md` (Hermes kommt zuletzt)
- **Entscheidung:** Research→Publish per API/CLI/manuell auslösen, bis Hermes Wochenjob steht.
- **Warum:** Entspricht Bauplan; entkoppelt App/Pipeline von Ops-Worker.

### D-10 — a11y: axe-core + Lighthouse blockieren Merge

- **Links:** [dequelabs/axe-core](https://github.com/dequelabs/axe-core) (MPL-2.0, ~7.5k★, aktiv); WCAG 2.2 AA in PRODUCT.md
- **Entscheidung:** CI mit axe-core (z. B. Playwright-Integration) und Lighthouse; Fehler = Merge-Block. Gates dürfen nicht abgeschaltet werden.
- **Warum:** Pflicht in jedem Arbeitspaket; Stopp-Regel in AGENTS.md.

