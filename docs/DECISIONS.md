# Architekturentscheidungen

Stand: AP-00 abgeschlossen (2026-10-02). Modellnamen und Features nur aus aktuellen Docs/Repos, nie aus dem Gedächtnis.

## Blocker / offene Secrets

| Secret | Status (2026-10-02 agent env) | Auswirkung |
| --- | --- | --- |
| Anthropic (Claude) API | **absent** (not in injected secrets) | Live-Recherche/Generate/Batch blockiert; MAF-Seed AO/RLP/Prüfung aktiv |
| OpenAI API | **absent** | Richter-Modell / Evaluate blockiert bis gesetzt |
| Langfuse (EU) | **absent** | Tracing/Datasets/Prompt-Versionen blockiert bis gesetzt |
| Supabase (EU) | **absent** | Persistenz live blockiert; Mocks/OpenAPI weiter möglich |
| Railway | **present** (`RAILWAY_API_TOKEN`) | Nur für späteren Hermes-Deploy (AP-10) |
| Vercel team link | auth ok / **403** on `siinanxds-projects` | `list_teams` leer; Deploy blockiert bis Re-Auth |

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

### D-11 — Qualitäts-Goldset: bestehende 70 MAF-Fragen (Online-Lerncampus), keine IHK-Originale

- **Links:** [siinanXD/Online-Lerncampus](https://github.com/siinanXD/Online-Lerncampus) (Maßstab laut PRODUCT); Langfuse Datasets/Experiments
- **Entscheidung:** Die 70 geprüften MAF-Fragen als Langfuse-Dataset/Zielwert; erzeugte Fragen müssen den Zielwert erreichen.
- **Warum:** Unabhängige Kalibrierung ohne urheberrechtlich geschützte IHK-Prüfungen.

### D-12 — Referenz-Repos, die die OSS-Schwelle erfüllen (Inspiration, kein Blind-Fork)

| Repo | Sterne / Lizenz / Aktivität | Nutzung |
| --- | --- | --- |
| [THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) | ~39k / MIT / aktiv | Agenten-Ideen |
| [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | sehr hoch / MIT / aktiv | AP-10 Ops |
| [dequelabs/axe-core](https://github.com/dequelabs/axe-core) | ~7.5k / MPL-2.0 / aktiv | a11y CI |

Duolingo-Alternativen auf GitHub hatten ≤2★ oder ungeeignete Lizenzen → **kein** Fork als App-Basis (Eigenbau Lernpfad laut PRODUCT + Figma).

## Annahmen (ohne Rückfrage)

1. GitHub-Repo [siinanXD/Content-Agent-Lernapp](https://github.com/siinanXD/Content-Agent-Lernapp) ist die kanonische Code-Heimat; Cloud-Origin-Remote spiegelt/liefert PRs.
2. API-Keys fehlen vorerst → AP-01/AP-02 (Scaffold, OpenAPI, Mocks) und Docs laufen weiter; Live-Calls erst mit Secrets.
3. Linear-Projekt `Content-Agent-Lernapp` (P-SIN-14) trägt AP-00–AP-12; Secrets bleiben User-seitig.

### D-13 — AP-03 Research: seed official MAF entry points without API key

- **Links:** [BIBB Berufesuche 51121](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121) (HTTP 200); [BERUFENET dkz 51121](https://berufenet.arbeitsagentur.de/berufenet/faces/index?path=null/kurzbeschreibung&dkz=51121) (HTTP 200); Claude [web_search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) / [web_fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool); model `claude-sonnet-5-5` ([docs](https://platform.claude.com/docs/en/models/sonnet-5-5/overview))
- **Entscheidung:** Ohne `ANTHROPIC_API_KEY` speichert `/research` verifizierte Seed-Quellen; mit Key ruft der Agent Claude+Tools und parst JSON-Quellen.
- **Warum:** AP-03 darf ohne Secrets nicht stoppen; Seeds sind erreichbare amtliche Einstiege, keine IHK-Prüfungen.

### D-14 — AP-03 acceptance: full AO + RLP + Prüfung seed (2026-10-02 harvest)

- **Links:** [MaschFüAusbV HTML](https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html); [MaschFüAusbV PDF](https://www.gesetze-im-internet.de/maschf_ausbv/MaschF%C3%BCAusbV.pdf); [BIBB regulation PDF](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/regulation/maschinen_und_anlagenfuehrer.pdf); [KMK RLP 31.03.2023](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf) (HTTP 200); [§ 9 Abschlussprüfung](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html); [§ 8 Zwischenprüfung](https://www.gesetze-im-internet.de/maschf_ausbv/__8.html); artifact `docs/research/maf-sources.json`; Claude [web_fetch beta header](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool)
- **Entscheidung:** Seed speichert **Ausbildungsordnung + Rahmenlehrplan + Prüfungsanforderungen (Verordnungsstruktur)**; Live-Pfad nutzt `claude-sonnet-5-5` mit Tool-Loop und `anthropic-beta: web-fetch-2025-09-10`; bei unvollständigem Live-Ergebnis Merge mit Seed für MAF. Keine IHK-Aufgabentexte.
- **Warum:** SIN-181 Akzeptanz verlangt AO/RLP/Prüfung mit Links; Cloud-Agent hatte 2026-10-02 nur `RAILWAY_API_TOKEN` injiziert (kein Anthropic) → Harvest über Agent-Web-Tools, Live-Pfad bleibt für Key bereit.

### D-15 — Secrets gap (2026-10-02 continuation agent)

- **Links:** Cloud Agents Secrets UI; `.env.example`; Vercel team `team_ZuQwQeQCoaAXbHB9StRzbsWv` / scope `siinanxds-projects`
- **Entscheidung:** Weiter ohne Live-Keys (Mocks, Seeds, Plan-JSON); Blocker dokumentieren. Vercel-Deploy blockiert bis Team-Scope re-auth.
- **Warum:** `CLOUD_AGENT_INJECTED_SECRET_NAMES` = nur `RAILWAY_API_TOKEN`; Anthropic/OpenAI/Langfuse/Supabase **absent**. Vercel MCP `list_teams` leer + 403 auf Team-Projekte.

### D-16 — AP-04 Plan: deterministic MAF day plans (2 variants) without API key

- **Links:** MaschFüAusbV §4 Berufsbild / §8–§9 Prüfung; KMK RLP MAF (verweist auf verwandte Metall-RLPs); PRODUCT.md (2–3 h/Tag, 5–10 min Einheiten); `src/lib/plan/maf-plan-seed.ts`
- **Entscheidung:** Seed liefert **Prüfungsvorbereitung 2 Monate (40 Tage × 2,5 h)** und **Weiterbildung 3 Monate (60 Tage × 2 h)** als JSON; Topics aus AO/RLP/Prüfungsstruktur (keine IHK-Aufgaben). Live-Pfad `claude-sonnet-5-5` structured JSON wenn Key da.
- **Warum:** SIN-182 Akzeptanz = Tagesplan für 2 Varianten; ohne Anthropic-Key darf AP-04 nicht blockieren.

### D-17 — AP-05 Generate: one complete Lernfeld seed + Batch path

- **Links:** [Message Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (50 %); model `claude-sonnet-5-5`; `src/lib/generate/maf-lernfeld-seed.ts`; AO/RLP source URLs from D-14
- **Entscheidung:** Seed erzeugt Lernfeld **Sicherheit und Gesundheitsschutz** (3 Einheiten, je 5–8 Fragen + Erklärungen + Quellenlinks). Live Messages; optional `useBatch` → `POST /v1/messages/batches` mit Seed-Rückgabe bis Poll. Keine IHK-Aufgabentexte, keine PII.
- **Warum:** SIN-183 Akzeptanz = 1 Lernfeld komplett; ohne Key weiterarbeiten; Batch senkt Kosten unter €20-Deckel.

### D-18 — AP-06 Quality gate: fixture goldset + thresholds block publish

- **Links:** PRODUCT.md Qualitätstabelle; Langfuse EU (Cloud EU region, see D-11); Judge `gpt-5.4-mini` (D-07); `src/lib/quality/*`
- **Entscheidung:** Offline-Fixture (12 Sample-MAF-Fragen inkl. bekannter Fail-Fälle) kalibriert Zielwerte; Schwellen `sourceFidelity=1`, `uniqueness=1`, `niveau≥4`, `language≥4`. `/evaluate` speichert Ergebnis; `/publish` liefert **409** ohne Evaluate und **422** unter Schwelle. Langfuse-Ingest nur wenn `LANGFUSE_*` gesetzt; OpenAI-Judge nur mit `OPENAI_API_KEY`.
- **Warum:** SIN-184 darf ohne Keys nicht stoppen; Schwelle muss Publish blockieren. Live-70er-Goldset: D-25.

### D-25 — AP-06 live: 70 AO/BIBB goldset in Langfuse EU + OpenAI judge calibration

- **Links:** [MaschFüAusbV](https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html); [§ 8 Zwischenprüfung](https://www.gesetze-im-internet.de/maschf_ausbv/__8.html); [§ 9 Abschlussprüfung](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html); [BIBB 51121](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/profile/apprenticeship/51121); [Langfuse Evaluation](https://langfuse.com/docs/evaluation/overview.md); [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini); D-07; D-11; `docs/quality/maf-goldset-70.json`
- **Entscheidung:** Goldset = **70 selbst verfasste Übungsfragen** aus Ausbildungsordnung/BIBB (Abruf 2026-10-02), **keine IHK-Originale**. Dataset `maf-goldset-70` in Langfuse Cloud EU. Richter **`gpt-5.4-mini`** (Chat Completions, JSON) — Anthropic-Judge nicht genutzt (D-07 zweite Familie; Workspace-Header nur falls Claude später 400/401 liefert). Live-Kalibrierung 2026-10-02: 45/70 PASS, Ziel `sourceFidelity=1`, `uniqueness=1`, `niveau=4`, `language=4.9`, Kosten ~0.08 USD. **Publish-Hartgatter = PRODUCT** (`language≥4`); Goldset-`language=4.9` ist Baseline, nicht 422-Schwelle. Live-`/evaluate` schreibt Trace + Scores nach Langfuse; `/publish` bleibt 409 ohne Evaluate und 422 unter Schwelle.
- **Warum:** SIN-184 Done-Kriterium; Keys sind vorhanden; D-07 gilt weiter; günstigstes bestätigtes Mini-Modell; €20-Deckel (Kalibrierung ≪ 20 USD).

### D-26 — Langfuse platform v4: JS/TS SDK v5 OTEL ingestion

- **Links:** [Upgrade to Langfuse v4](https://langfuse.com/faq/all/upgrade-to-langfuse-v4); [JS/TS v4 → v5](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5); [Custom ingestion → OTEL](https://langfuse.com/integrations/native/opentelemetry/migration-to-v4); [Deprecated API migration](https://langfuse.com/faq/all/deprecated-api-migration); D-05; D-25
- **Entscheidung:** Quality-gate Ingest migriert von raw legacy public REST ingest (`trace-create` events) auf **`@langfuse/tracing` + `@langfuse/otel` + `@langfuse/client` ≥ 5.4.0** (aktuell 5.11.1). Root-Observation trägt Input/Output; Attribute via `propagateAttributes`; Scores observation-level; Datasets über SDK. Optional `LANGFUSE_TRACING_ENVIRONMENT` / `LANGFUSE_RELEASE`.
- **Warum:** Langfuse Cloud schaltet Legacy-Ingest am 2026-11-16 ab; observations-first Modell braucht OTEL + propagated attributes.

### D-19 — AP-07 Figma Design-System + Token-Spiegel (Freigabe Sinan)

- **Links:** [Figma: Content-Agent-Lernapp Design](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz); `docs/design/FIGMA.md`; `docs/design/tokens.json`; `src/app/globals.css`; Linear [SIN-185](https://linear.app/sinan-kahraman/issue/SIN-185/ap-07-figma-design-system-und-5-screens)
- **Entscheidung:** Design-System in Figma angelegt (Color/Spacing/Radius-Variablen; Komponenten Button, Input, Progress, OptionChoice; 5 Screens Start→Profil). CSS-Token-Spiegel im Repo. Visuelle Richtung: Teal `#0B5F6E` / Hero `#0A3D4A` / Accent Messing `#A67C00` / Canvas `#EAF0F4`; Typo Space Grotesk + IBM Plex Sans; WCAG 2.2 AA ≥4,5:1. Bewusst ohne Cream/Terracotta- und Lila-Klischees. **Keine automatische Done-Markierung** — **Freigabe durch Sinan erforderlich**, bevor AP-08 die Datei als verbindlich nutzt.
- **Warum:** PRODUCT.md verlangt einmaliges Figma der 5 Hauptscreens und menschliche Freigabe; Code-Agenten sollen Tokens nicht erfinden.

### D-20 — AP-08 Learner UI: playable path from approved Figma

- **Links:** Figma `0SWGDO2ioBD3MyXiAnrbRz`; routes `/`, `/lernpfad`, `/einheit/[unitId]`, `/ergebnis`, `/profil`; Linear [SIN-186](https://linear.app/sinan-kahraman/issue/SIN-186/ap-08-5-hauptscreens-spielbar)
- **Entscheidung:** App Router screens implementieren die 5 freigegebenen Figma-Hauptscreens mit Token-Spiegel; spielbarer Pfad Start→Lernpfad→Einheit→Ergebnis (sessionStorage). Inhalt aus MAF-Sicherheit-Seed / AO-RLP-Copy, keine IHK-Aufgaben.
- **Warum:** SIN-186 Akzeptanz = eine Einheit spielbar; Design nach Sinan-Freigabe verbindlich.

### D-21 — AP-09 a11y gates + offline shell

- **Links:** [axe-core](https://github.com/dequelabs/axe-core); Playwright `@axe-core/playwright`; Lighthouse accessibility category; Linear [SIN-187](https://linear.app/sinan-kahraman/issue/SIN-187/ap-09-barrierefreiheit-und-offline); workflow `.github/workflows/a11y.yml`
- **Entscheidung:** CI blockiert bei axe critical/serious und Lighthouse a11y unter 0.9. Service Worker cached Learner-Shell (`public/sw.js`). Profil-Schalter: Einfache Sprache + Vorlesen (`speechSynthesis`). Gates nicht abschaltbar.
- **Warum:** PRODUCT.md / D-10; Offline und alte Android-Geräte; SIN-187 Akzeptanz.

### D-22 — AP-10 Hermes: scaffold/docs only until Telegram secrets

- **Links:** [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent); Railway EU; Linear [SIN-188](https://linear.app/sinan-kahraman/issue/SIN-188/ap-10-hermes-betrieb); `docs/ops/HERMES.md`
- **Entscheidung:** Runbook + `hermes:dry-run` gegen Seed-Quellen shippen. **Kein** Live-Deploy: `RAILWAY_API_TOKEN` allein reicht nicht (Telegram-Bot/Chat + Hermes-Config fehlen). Manueller Pipeline-Start bleibt gültig (D-09).
- **Warum:** AP-10 darf ohne Ops-Secrets nicht blockieren; Entscheidung dokumentiert statt Pseudo-Telegram.

### D-23 — AP-11 Pilot: seed/fixture path without live LLM

- **Links:** Linear [SIN-189](https://linear.app/sinan-kahraman/issue/SIN-189/ap-11-pilotkurs-maf-komplett); `docs/pilot/MAF-PILOT.md`; `npm run pilot:maf`; Deckel €20/Kurslauf
- **Entscheidung:** Pilot akzeptiert den **Seed/Fixture**-Pfad (create→research→plan→generate→evaluate→publish) mit `liveLlm: false` und `estimatedCostEur: 0`. Live-Langfuse-Kosten/Bewertung folgen, sobald Keys da sind.
- **Warum:** Secrets absent; Publish-Gate und AO/RLP-Seeds decken die Pipeline-Akzeptanz für diesen Boot.

### D-24 — AP-12 Learning loop: fixture scaffold, no PII, no training

- **Links:** Linear [SIN-190](https://linear.app/sinan-kahraman/issue/SIN-190/ap-12-lern-schleife-aus-nutzungsdaten); `docs/learning/LOOP.md`; `POST /api/learning/weekly`
- **Entscheidung:** Scaffold rankt Top-5 schwache Einheiten aus Fixture-Aggregaten und schlägt Prompt-Patches vor. Kein Modell-Training; keine PII; Live-Aggregation erst nach Pilot + DSGVO-Einwilligung.
- **Warum:** SIN-190 hängt an Nutzungsdaten; ohne Traffic liefert der Scaffold die API/Regel-Form.
