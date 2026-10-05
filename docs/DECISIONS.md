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

### D-26 — AP-13 Curriculum-Map MAF: zwei Jahre, RLP Industriemechaniker als Referenz, 870 Einheiten

- **Links:** [MaschFüAusbV](https://www.gesetze-im-internet.de/maschf_ausbv/BJNR064700004.html) (§ 2 zwei Jahre, § 4 Berufsbild, § 10 Fortsetzung); [Anlage zu § 5](https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html) (Wochen je Ausbildungsjahr); [§ 8](https://www.gesetze-im-internet.de/maschf_ausbv/__8.html); [§ 9](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html); [BGBl. I 2004 Nr. 19 via BIBB](https://www.bibb.de/dienst/berufesuche/de/index_berufesuche.php/regulation/maschinen_und_anlagenfuehrer.pdf); [KMK RLP MAF 31.03.2023](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf) (keine eigenen Lernfelder, verweist auf Fortsetzungsberufe); [KMK RLP Industriemechaniker 23.02.2018](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriemechaniker-IH04-03-25-idf-18-02-23.pdf) (LF 1–9: 320 + 280 Std.); [KMK WiSo-Qualifikationsprofil 17.06.2021](https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2021/2021_06_17-Berufsschule-Unterricht-Wirtschafts-Sozialkunde.pdf) (40 Std.); Linear [SIN-191](https://linear.app/sinan-kahraman/issue/SIN-191); `docs/content/MAF-CURRICULUM.md`; `docs/content/maf-curriculum.json`; `src/lib/content/maf-curriculum.ts`
- **Entscheidung:** Der Kurs plant **zwei Ausbildungsjahre** (§ 2), kein drittes; ein Anschluss nach § 10 (z. B. Industriemechaniker LF 10–15) ist ein eigenes Produkt. Referenz-Rahmenlehrplan für den Schwerpunkt Metall ist **Industriemechaniker/in** (LF 1–4 laut RLP für alle Metallberufe inhaltsgleich; häufigste Fortsetzung). Die Map hat **16 Module / 870 Einheiten**: Querschnitt M0 (AO Nr. 1–4), LF 1–9, MAF-Kern „Produktionsanlagen“ direkt aus Anlage II.A Nr. 5–6, Qualitätssicherung, WiSo (KMK 2021) und drei Prüfungstrainings (§ 8, § 9 PT/PP). Budget: 1 Einheit je RLP-Unterrichtsstunde, übrige Module nach Gewicht in Anlage und § 9. Erzeugung in **vier Phasen** (A: M0, LF1, LF2, PA = 280 Einheiten) je unter dem 20-€-Deckel. Die JSON ist der Vertrag für Plan-/Generate-Agent (AP-14); `npm test` prüft Summen (320/280 Std., 52 Wochen je Jahr, 50/30/20 %).
- **Warum:** AGENTS.md verlangt amtliche Quellen und verbietet Rückfragen; die bisherigen Seeds (24 Topic-Titel, 1 Lernfeld) reichen nicht, um den Agenten auf den ganzen Beruf einzustellen. Wochen der Anlage sind so gruppiert, wie die Klammern der Verordnung sie zusammenfassen (Jahr 1: Nr. 9–11 = 22 Wo.; Jahr 2: Nr. 1–2 = 8, Nr. 4–5 = 18). Abruf 2026-10-03 über Exa, weil der Cloud-Agent-Proxy die Domains sperrt. Freigabe der Map durch Sinan steht aus.

### D-27 — AP-13 Erweiterung: MAF alle fünf Schwerpunkte (7 Maps) und Industriekaufleute 2024 (1 Map)

- **Links:** MAF: [MaschFüAusbV Anlage II.A–E](https://www.gesetze-im-internet.de/maschf_ausbv/anlage.html), [§ 9 Abs. 3 Nr. 1–5](https://www.gesetze-im-internet.de/maschf_ausbv/__9.html), [KMK RLP MAF](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/MaschinenAnlagenfuehrer04-03-25idF23-03-31.pdf) (Verweis auf Fortsetzungsberufe); Referenz-RLPs: [Kunststoff- und Kautschuktechnologe](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/KuKTechnologe-12-03-22idf23-03-31-mitEL.pdf), [Produktionsmechaniker-Textil (NRW-Wiedergabe)](https://berufsbildung.nrw.de/system/files/media/document/file/produktionsmechanik_textil.pdf), [Produktveredler-Textil](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/ProduktveredelerTextil.pdf), [Fachkraft für Lebensmitteltechnik](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/FKLmt.pdf), [Buchbinder/Medientechnologe Druckverarbeitung](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/BuchbinderMedientechnDruckverarbeitung11-03-25-E_03.pdf), [Packmitteltechnologe](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Packmitteltechnologe11-03-25-E.pdf). Industriekaufleute: [IndKflAusbV 12.03.2024](https://www.gesetze-im-internet.de/indkflausbv/BJNR05E0A0024.html) (§ 2 drei Jahre, § 4 Abs. 4 Einsatzgebiete, §§ 6–15 gestreckte Prüfung 25/35/30/10), [Anlage](https://www.gesetze-im-internet.de/indkflausbv/anlage.html), [KMK RLP Industriekaufleute 15.12.2023](https://www.kmk.org/fileadmin/Dateien/pdf/Bildung/BeruflicheBildung/rlp/Industriekaufleute_2023-12-15-mitEL.pdf) (13 LF, 880 Std.). Repo: `docs/content/README.md`, `docs/content/*.json`, `scripts/content-render-curriculum.mjs`, `src/lib/content/curriculum.ts`; Linear [SIN-191](https://linear.app/sinan-kahraman/issue/SIN-191)
- **Entscheidung:** Priorität laut Sinan: MAF in allen Richtungen und Industriekaufleute in allen Varianten müssen von Anfang an funktionieren. **MAF:** eine Map je Schwerpunkt; Metall/Kunststoff und Druck/Papier bekommen je zwei Maps, weil der KMK-RLP MAF dort zwei verschiedene Fortsetzungsberufe als Referenz nennt (Industriemechaniker vs. Kunststoff- und Kautschuktechnologe; Medientechnologe Druckverarbeitung vs. Packmitteltechnologe). Betriebliche Achse (Anlage I gemeinsam, II.A–E je Schwerpunkt, je 52 Wochen) und Prüfungsgebiete (§ 9 Abs. 3 Nr. 1–5) kommen aus der Verordnung; M0, ZP, QS, WISO sind geteilt; das MAF-Kern-Modul PA folgt Anlage II.x Nr. 5–6. Lebensmittel: Referenz Fachkraft für Lebensmitteltechnik (Brauer/Mälzer, Fruchtsaft als Alternativen notiert). **Industriekaufleute:** eine Map, drei Jahre, 13 Lernfelder; Einsatzgebiete sind keine Fachrichtungen (gleiche Lernfelder, gleiche schriftliche Prüfung), darum ein Modul `EG` mit einem Block je Einsatzgebiet plus Methodikblock; gestreckte Prüfung als `gradedParts` 25/35/30/10. **Format:** Schema v2 (`family`, `aoZeitrahmen.sections`, `exam.gradedParts`), Markdown wird aus der JSON generiert, ein Test iteriert alle Maps.
- **Warum:** AGENTS.md verlangt amtliche Quellen; der RLP MAF selbst hat keine Lernfelder, also muss je Schwerpunkt der Referenz-RLP gewählt werden. Die KMK-Datei des RLP Produktionsmechaniker-Textil war nicht auffindbar, genutzt wird die wortgleiche Wiedergabe des Landesinstituts NRW (Annahme, bei Fund austauschen). Der RLP Industriekaufleute 2023 ist kompetenzorientiert ohne Inhaltslisten; Themen je Block sind aus den Lernfeldbeschreibungen abgeleitet. Freigabe aller Maps durch Sinan steht aus.

### D-28 — AP-13/AP-16: Rechtsstand 2026 geprüft, Standardberufsbildpositionen als Modul `SBP`, Quellen-Monitor statt Handprüfung

- **Links:** [BIBB Neuordnungen](https://www.bibb.de/de/41.php) (22 modernisierte Berufe zum 1.8.2026, Technischer Modellbauer zum 1.8.2027); [KMK Downloadbereich Rahmenlehrpläne](https://www.kmk.org/service/servicebereich-berufliche-schulen/downloadbereich-rahmenlehrplaene.html) (Beschlussdaten); [BIBB HA-Empfehlung 172 (17.11.2020)](https://www.bibb.de/dokumente/pdf/HA172.pdf) (Standardberufsbildpositionen für Verordnungen vor 2021); [Aktualitätendienst gesetze-im-internet.de](https://www.gesetze-im-internet.de/aktuDienst.html); [changedetection.io](https://github.com/dgtlmoon/changedetection.io) (Apache-2.0, 33k Sterne, aktiv); Linear [SIN-191](https://linear.app/sinan-kahraman/issue/SIN-191), [SIN-194](https://linear.app/sinan-kahraman/issue/SIN-194); Repo: `docs/content/sources.lock.json`, `src/lib/content/source-watch.ts`, `scripts/content-check-sources.mjs`, `src/lib/hermes/weekly-check.ts`
- **Entscheidung:** (1) **Rechtsstand 2026:** Alle 24 Quellen der acht Maps sind aktuell. MaschFüAusbV steht auf „Zuletzt geändert durch Art. 2 V v. 14.6.2023 I Nr. 151“, IndKflAusbV (12.03.2024) ist unverändert, die neun Referenz-Rahmenlehrpläne tragen im KMK-Downloadbereich dieselben Beschlussdaten wie in den Maps; keine Neuordnung 2026/2027 und kein laufendes Verfahren betrifft MAF oder Industriekaufleute. Hinweis aus IHK-Praxis (nicht amtlich geprüft): Die frühere Anrechnung der MAF-Abschlussprüfung als Teil 1 der industriellen Metallberufe ist mit der Metallberufe-Novelle 2018 entfallen; § 10 MaschFüAusbV (Fortsetzung) bleibt, die Maps modellieren weiterhin nur zwei Jahre (D-26). (2) **Lücke geschlossen:** Die Standardberufsbildpositionen 2021 (Umweltschutz und Nachhaltigkeit, digitalisierte Arbeitswelt) gelten für MAF nur als Empfehlung, weil die Verordnung aus 2004 stammt. Sie kommen trotzdem in alle sieben MAF-Maps als Modul `SBP` (20 Einheiten, Phase D, Quellenart `empfehlung`), getrennt von den Pflichtpositionen der Anlage; für Industriekaufleute sind sie in Abschnitt B der Anlage Pflicht und bereits in `DIG`/`WISO` enthalten. Neue Summen: Metall/Kunststoff/Druckverarbeitung 890, Textil/Textilveredelung/Lebensmittel/Packmittel 850 Einheiten. (3) **Aktualität automatisieren (AP-16):** Je Quell-URL ein Versionsmarker im Lock (Stand-Zeile von gesetze-im-internet.de, KMK-Beschlussdatum aus dem Downloadbereich, sonst ETag/Last-Modified/Hash). `npm run content:check-sources` vergleicht wöchentlich, scannt Aktualitätendienst und BIBB-Neuordnungen nach 20 Berufsnamen, liefert betroffene Module und Blöcke je Map (Exit 2) und bricht ab, wenn eine Map-Quelle im Lock fehlt (Exit 3). Läuft ab sofort als GitHub-Action `.github/workflows/source-check.yml` (montags; Exit 2 → Issue mit Label `quellen-monitor`, Exit 3 → Job rot) und später im Hermes-Wochenjob auf Railway mit Telegram; im Cloud-Agent nur offline. Nach einem Treffer entscheidet ein Mensch über Map-Anpassung, `--update` und Neu-Erzeugung; kein automatisches Publish. Lock am 2026-10-03 von Hand geseedet, ETag/Hash füllt der erste Live-Lauf. (4) **Übergang:** `docs/content/maf-curriculum.json` und `src/lib/content/maf-curriculum.ts` (v1, nur Metall) bleiben im Repo als Legacy; AP-14 (D-32) bindet Plan/Generate an `loadMafCurriculum()` → `maf-metall.json`. v1-Löschung kann folgen, sobald keine Tests mehr darauf zeigen.
- **Warum:** AGENTS.md verlangt amtliche Quellen und ein Abrufdatum je Lerneinheit; eine Änderungsverordnung oder ein KMK-Beschluss macht Inhalte ungültig, ohne dass es jemand merkt. Fertige Lösung geprüft: changedetection.io erfüllt die Lizenz-, Alter- und Sterne-Kriterien, braucht aber einen eigenen Dienst mit Speicher und kennt die Map-Struktur nicht (betroffene Module, Stand-Zeile, KMK-Datum bräuchten eigene Parser). Nach der Regel „weniger Abhängigkeiten“ darum ~180 Zeilen eigene Logik ohne neue Pakete; changedetection.io bleibt als Fallback für reinen Seiten-Diff notiert. Der Cloud-Agent kann die Quellen nicht live lesen (Proxy sperrt die Domains, siehe D-26), deshalb Seed per Hand und Live-Lauf auf Railway/CI.

### D-29 — AP-16 Hermes-Wochenjob: Maps statt Seed, Alerts soft-fail, selektives Refresh

- **Links:** Linear [SIN-194](https://linear.app/sinan-kahraman/issue/SIN-194/ap-16-quellen-monitor-rechtsstand-der-curriculum-maps-wochentlich); [Telegram Bot API sendMessage](https://core.telegram.org/bots/api#sendmessage); [Linear GraphQL issueCreate](https://developers.linear.app/docs/graphql/working-with-the-graphql-api); Repo: `src/lib/hermes/weekly-check.ts`, `scripts/hermes-weekly.mjs`, `scripts/content-check-sources.mjs`, `docs/content/sources.lock.json`, `docs/ops/HERMES.md`, `POST /courses/{id}/refresh` (`docs/api/openapi.yaml`)
- **Entscheidung:** (1) Hermes liest Quellen ausschließlich über `loadAllCurricula()` (alle `docs/content/*.json` außer Legacy `maf-curriculum.json`), nicht mehr `docs/research/maf-sources.json`. (2) Bei Änderung: Telegram-Kurzbericht + Linear-Issue-Titel **`Quelle geändert: <mapId>`** + Map-Feld `status` = **`Prüfung nötig`**; betroffene Module/Blöcke kommen aus Block-`sourceIds` und gehen als Body an `POST /courses/{id}/refresh`. (3) `TELEGRAM_*` und `LINEAR_API_KEY`/`LINEAR_TEAM_ID` sind optional — fehlende Secrets überspringen den Kanal mit `skippedReason`, der Check/die Tests bleiben grün. Live-HTTP nur auf Railway oder GHA-Cron (`source-check.yml`); im Cloud-Agent nur Fixture-/Offline-Pfad.
- **Warum:** SIN-194 verlangt den Hermes-Pfad explizit; Secrets und Domain-Egress sind in dieser Umgebung oft blockiert — Code muss trotzdem vollständig und testbar sein, ohne den Package-Lauf zu sprengen.

### D-30 — AP-17 Supabase persistence with mock-store fallback

- **Links:** [Supabase JS `createClient`](https://supabase.com/docs/reference/javascript/initializing); [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security); [Service role / secret key server-only](https://supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z); OpenAPI `docs/api/openapi.yaml`; Linear [SIN-195](https://linear.app/sinan-kahraman/issue/SIN-195/ap-17-supabase-persistenz-statt-mock-store); migration `supabase/migrations/20261003030000_ap17_course_persistence.sql`; runbook `docs/ops/SUPABASE.md`
- **Entscheidung:** Speicher-Schnittstelle `CourseStorage` in `src/lib/storage/`: **Supabase** (service-role client, server-only) wenn `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` gesetzt; sonst und bei `COURSE_STORAGE=mock` weiter **`mock-store`** (Tests / fehlende Secrets). SQL-Tabellen: `courses`, `sources` (url + `fetched_at`), `plans`, `units`, `questions`, `evaluations`, `learning_progress` (nur `anonymous_id` UUID, keine PII). RLS auf allen Tabellen ohne anon-Policies (deny-by-default). Pipeline-API-Routen und `POST /api/progress` nutzen `getStorage()`. Migrationen nur additiv (AGENTS.md). Vor AP-15 ausführen, damit live erzeugte Einheiten nicht nur im RAM liegen.
- **Warum:** SIN-195 Akzeptanz; Neustart-feste Kurse; Tests ohne Live-Keys grün; Service-Role nie im Browser.

### D-31 — AP-18 Didaktik-Vorgabe: drei Modi, feste Schablonen, Wiederholung, Prüfungsmodus, Bilder

- **Links:** `docs/PRODUCT.md` (Einheiten 5 bis 10 Minuten, 5 Fragetypen, Lern-Schleife); `docs/content/DIDAKTIK.md`; [Mermaid](https://github.com/mermaid-js/mermaid) (MIT, 90 000 Sterne, aktiv); [OpenAI Image generation](https://developers.openai.com/api/docs/guides/image-generation) (Modelle `gpt-image-2.5-sunburst` und `gpt-image-2.5-flare`, gelesen 2026-10-03); WCAG 2.2 AA laut AGENTS.md; `docs/design/FIGMA.md`; Linear [SIN-196](https://linear.app/sinan-kahraman/issue/SIN-196)
- **Entscheidung:** (1) Jede Lerneinheit folgt einer festen Schablone (`einstieg`, `kern` bis 120 Wörter, `beispiel`, `merksatz`, optional `image`, Quelle) in vier Varianten (standard, ablauf, rechnen, sicherheit); der Agent füllt Felder, erfindet keine Struktur. (2) Jede Frage trägt eine Stufe (`erinnern`/`verstehen`/`anwenden`, Mix 2/3/2) und folgt Typregeln je Fragetyp; Rückmeldung bis 60 Wörter mit Quelle. (3) Wiederholung nach dem Leitner-Prinzip (1/3/7/14 Tage), Tagesziel = fällige Wiederholungen vor neuen Einheiten. (4) Prüfungsmodus je Eintrag in `exam.gradedParts` mit Zeit und Gewichtung aus der Verordnung, Ergebnis je Gebiet mit Ampel 80/60 %; offene Aufgaben nur mit Musterlösung zur Selbstkontrolle, keine KI-Bewertung; praktischer Teil und Fachaufgabe werden nicht nachgebildet. (5) Bilder nur, wo sie Verstehen beschleunigen: Vorrang selbst erzeugte SVG (Mermaid-Flussdiagramme, SVG-Vorlagen für Skizze und Diagramm), dann freie Bilder mit gespeicherter Lizenz (CC0, CC BY, Public Domain), KI-Bilder nur als Illustration nach menschlicher Freigabe und nie für technische Fakten; jedes Bild mit Alt-Text, Beschreibung, Lizenz und Quelle; Phase A nutzt nur generierte SVG. (6) Schema-Erweiterung `sections`, `variant`, `image`, `level`, `examAreas`, `ReviewItem`, `ExamSet`; `explanation` bleibt als Fallback. Drei neue Screens: Lernpfad gruppiert, Wiederholung, Prüfungsmodus. Reihenfolge: Schema (18a) vor dem Merge von AP-14, AP-15 Phase A erst danach.
- **Warum:** PRODUCT.md beschreibt nur „Erklärung, dann Fragen“; ohne Schablone würden die 280 Einheiten der Phase A nach einer Form erzeugt, die später geändert wird. Die Einheit-Seite rendert heute nur den Fragetyp Auswahl. AGENTS.md: die KI bewertet keine Lernenden, Barrierefreiheit ist nicht abschaltbar, IHK-Aufgaben sind verboten. Mermaid erfüllt die Regel „fertige Open-Source-Lösung vor Eigenbau“; Bild-KI bleibt wegen Fehlerrisiko bei Fakten und offener Preisprüfung auf Illustration beschränkt. Stufenmix, Leitner-Intervalle und Ampel sind Startwerte, die Lern-Schleife (AP-12) misst nach. Freigabe durch Sinan offen.

### D-32 — AP-14 Plan-/Generate-Agent an Curriculum-Map gebunden (Didaktik-Prompts)

- **Links:** Linear [SIN-192](https://linear.app/sinan-kahraman/issue/SIN-192); `docs/content/maf-metall.json`; `src/lib/content/curriculum.ts`; `src/lib/plan/maf-plan-seed.ts`; `src/lib/plan/plan-agent.ts`; `src/lib/generate/generate-agent.ts`; `src/lib/generate/didaktik-prompts.ts`; `src/lib/quality/evaluate-agent.ts`; `docs/api/openapi.yaml`; D-26; D-31
- **Entscheidung:** Plan-Agent liest `loadMafCurriculum()` (Pilot: `maf-metall.json`), Module in `order`, M0 etwa jede 5. Einheit; jede Plan-Einheit trägt `moduleId`/`blockId`/`sourceKind`/`niveau`; Varianten 40×2,5 h / 60×2 h bleiben. Generate baut **einen Didaktik-Prompt/Batch-Request pro Block** via `buildDidaktikBlockPrompt` (Themen, Quellen-URLs, Jahr/Niveau, Mix, Variante, Einheitenzahl); Ausgabe + Seed tragen `moduleId`/`blockId`; Prompt verbietet IHK-Aufgaben und Personendaten; `rechnen`/`sicherheit`-Varianten aus D-31. Evaluate prüft `niveau` gegen Modul-Jahr (ZP vs. AP), nicht Kurs-Mittelwert, und übernimmt `safetyFlag` aus der Map. Ohne API-Key bleibt Seed-Fallback (M0-3). Live-Erzeugung ganzer Phasen = AP-15.
- **Warum:** Ohne Map-Bindung bleiben Plan/Generate generisch; nach AP-18 muss die Bindung die Didaktik-Schablonen nutzen statt der v1-explanation-only Skeleton-Prompts aus dem alten PR #20.

### D-33 — AP-15 Phase A live: Console Batch only, Judge, Supabase, €20-Guard

- **Links:** Linear [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193); Anthropic Console auth / workspace header ([docs](https://platform.claude.com/docs/en/manage-claude/authentication)); Message Batches ([docs](https://platform.claude.com/docs/en/build-with-claude/batch-processing)); D-06; D-07; D-30; PR #27 (`ANTHROPIC_WORKSPACE_ID`); `scripts/ap15-phase-a.ts`; `docs/ops/AP15-PHASE-A.md`; `docs/ops/DECISIONS-D28-D33.md`
- **Entscheidung:** (1) Messages/Batch **nur über Anthropic Console API** mit `ANTHROPIC_API_KEY` + `anthropic-workspace-id` — Claude Max/Mac-Abo kann Batch/Messages **nicht** abrechnen. Fehlt der Key: stoppen und nur PRESENT/MISSING melden. (2) Phase A in Chunks zu je 2 Einheiten, `max_tokens=64000` (16k truncierte ~74/79 Requests). (3) Persistenz Supabase (`courses.lernfeld` volles JSON). (4) Richter `gpt-5.4-mini`; Regen einmal — bei Console `credit balance too low` Regen überspringen, nur Judge-Passers publishen. (5) Safety 10 %-Stichprobe vor Publish dokumentieren. (6) Kostenledger €20; Lauf ~€12.8. (7) Goldset `maf-goldset-phase-a`; Lernpfad lädt Units via `GET /api/learner/phase-a` (kein 2‑MB JSON im Repo).
- **Warum:** Max-Abo ≠ Console-Credits; ohne Workspace-Header 400; Chunk/Token-Limits sonst JSON-Truncation; Guthaben-Ende muss Pipeline graceful beenden.


### D-34 — Langfuse platform v4: JS/TS SDK v5 OTEL ingestion

- **Links:** [Upgrade to Langfuse v4](https://langfuse.com/faq/all/upgrade-to-langfuse-v4); [JS/TS v4 → v5](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5); [Custom ingestion → OTEL](https://langfuse.com/integrations/native/opentelemetry/migration-to-v4); [Deprecated API migration](https://langfuse.com/faq/all/deprecated-api-migration); D-05; D-25; Linear [SIN-197](https://linear.app/sinan-kahraman/issue/SIN-197)
- **Entscheidung:** Quality-gate Ingest migriert von raw legacy public REST ingest (`trace-create` events) auf **`@langfuse/tracing` + `@langfuse/otel` + `@langfuse/client` ≥ 5.4.0** (aktuell 5.11.1). Root-Observation trägt Input/Output; Attribute via `propagateAttributes`; Scores observation-level; Datasets über SDK. Optional `LANGFUSE_TRACING_ENVIRONMENT` / `LANGFUSE_RELEASE`. OTEL-Peers auf v2 via `package.json` `overrides` + `.npmrc` `legacy-peer-deps=true` (Koexistenz mit lighthouse→sentry OTEL v1).
- **Warum:** Langfuse Cloud schaltet Legacy-Ingest am 2026-11-16 ab; observations-first Modell braucht OTEL + propagated attributes.


### D-35 — Sentry EU + PostHog EU for production errors and Einheit usage

- **Links:** [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/); [Sentry Data Storage Location](https://docs.sentry.io/organization/data-storage-location/) (EU → `ingest.de.sentry.io`); [PostHog Next.js](https://posthog.com/docs/libraries/next-js); PostHog Cloud EU host `https://eu.i.posthog.com`; Linear [SIN-203](https://linear.app/sinan-kahraman/issue/SIN-203/sentry-und-posthog-in-content-agent-lernapp-einbauen); runbook `docs/ops/SENTRY-POSTHOG.md`
- **Entscheidung:** (1) **Sentry** via `@sentry/nextjs` — `instrumentation.ts` / `instrumentation-client.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` / `withSentryConfig` in `next.config.ts` / `global-error.tsx`. DSN nur über `NEXT_PUBLIC_SENTRY_DSN`; fehlt der Wert → SDK bleibt No-Op. Source-Maps nur mit `SENTRY_AUTH_TOKEN` (+ `SENTRY_ORG` / `SENTRY_PROJECT`). (2) **PostHog** Cloud EU: Provider in `layout.tsx`, Events in `src/lib/analytics.ts` (`unit_started`, `unit_completed`, `question_answered`) verdrahtet in der Einheit-Seite. Keys `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` optional (Default-Host EU). (3) Keine Secrets im Repo; Live-Verify nach Vercel-Env durch Sinan.
- **Warum:** SIN-203 Akzeptanz — Fehler vor Nutzer-Meldungen, Nutzung je Lerneinheit; Builds/Tests ohne Observability-Keys müssen grün bleiben (parallel zu SIN-201 CI).


### D-36 — Auto-Merge-Pipeline: Risiko-Gate, Squash-Auto-Merge, Reparatur-Schleife

- **Links:** Linear [SIN-207](https://linear.app/sinan-kahraman/issue/SIN-207/auto-merge-pipeline-in-content-agent-lernapp-pilot); [GitHub Auto-Merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request); [claude-code-action](https://github.com/anthropics/claude-code-action); `.github/workflows/pr-gate.yml`; `.github/workflows/repair.yml`; `.github/workflows/ci.yml`; `e2e/smoke.spec.ts`; D-35
- **Entscheidung:** (1) `pr-gate` (Event `pull_request`, kein Checkout von PR-Code) prüft den PR-Titel (Conventional Commit + `SIN-…`), setzt `risk:low|medium|high` nach geänderten Dateien und schaltet GitHub-Auto-Merge (Squash) für low/medium ein; risk:high hält den Pflicht-Check `merge-gate` rot, bis Sinan das Label `freigegeben` setzt. Forks sind immer risk:high. (2) `build` bekommt Unit-Tests sowie Playwright-Smoke und axe-core gegen `next start` (Mock-Storage) statt gegen eine Vercel-Preview: läuft für alle Branches (auch `cursor/*`, die laut `vercel.json` keine Preview bauen) und braucht keinen Bypass-Secret. `PLAYWRIGHT_BASE_URL` erlaubt später Tests gegen eine Preview. (3) `repair` reagiert auf rote `ci`-Läufe von PRs aus diesem Repo mit `claude-code-action` (Sonnet), max. 3 Runden pro PR, dann `needs-human`.
- **Warum:** Sinan soll nur noch risikoreiche PRs freigeben. Alles im Free Tier: öffentliches Repo → Actions-Minuten frei, keine Bezahl-Dienste. Merges per `GITHUB_TOKEN` lösen keinen `push`-Workflow aus; das Vercel-Deploy von `main` läuft trotzdem über die Vercel-GitHub-App.


### D-37 — Bewertung pro Frage (append-only) und echte Claude-Kosten

- **Links:** Linear [SIN-216](https://linear.app/sinan-kahraman/issue/SIN-216); Anthropic Message Batches [docs](https://platform.claude.com/docs/en/build-with-claude/batch-processing); Prompt Caching [docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching); `supabase/migrations/20261005010000_ap19_question_evaluations.sql`; `src/lib/quality/question-evaluations.ts`; `src/lib/quality/cost-guard.ts`; D-33
- **Entscheidung:** (1) Neue Tabelle `question_evaluations` (nur `insert`, RLS an, keine Policies) und View `question_quality_latest` (`security_invoker`); `evaluations` bleibt die Kurs-Zusammenfassung. Jeder Richter-Lauf bekommt `runId` und `promptVersion` (`JUDGE_PROMPT_VERSION`, bei Prompt-Änderung hochzählen). `niveau`/`sprache` sind `numeric(2,1)`, weil der Richter eine Nachkommastelle zulässt. (2) Claude-`usage` (`input`, `output`, `cache_creation_input`, `cache_read_input`) wird je Batch-Ergebnis in den Ledger summiert und per `recordClaudeUsageTrace` nach Langfuse geschrieben; Cache-Schreiben = 1,25×, Cache-Lesen = 0,1× des Batch-Eingabepreises. (3) **Backfill-Annahme:** Die bestehende Kurs-Payload in `evaluations.payload` enthält `questions[]` nur, wenn der Lauf sie mitgeschrieben hat; es gibt weder `runId` noch `promptVersion`. Daher kein automatischer Backfill; historische Läufe bleiben nur in der Kurs-Zusammenfassung. Neue Läufe schreiben ab jetzt pro Frage. Live-Läufe (Migration anwenden, Phase A neu bewerten) macht Sinan mit Keys.
- **Warum:** Ein Eintrag pro Kurs überschrieb jeden Lauf; ohne Historie ist keine Frage nachvollziehbar. Die Ledger-Tokens standen auf 0, die Kosten waren geschätzt.


### D-38 — Autonomie: Gate auf medium, Dispatcher, Planer, Definition fertig

- **Links:** Linear [SIN-223](https://linear.app/sinan-kahraman/issue/SIN-223); [Linear GraphQL API](https://linear.app/developers/graphql); [claude-code-action Automation](https://github.com/anthropics/claude-code-action); [gitleaks](https://github.com/gitleaks/gitleaks); D-36; `scripts/autonomy/`; `docs/autonomy/`
- **Entscheidung:** (1) Risiko-Regeln stehen als reine Funktionen in `scripts/autonomy/risk.mjs` (Tests in `src/lib/autonomy/`); Standard `risk:medium`, `risk:high` nur bei Secret, Datenverlust, geschwächter Sicherheit, Zahlungen, Grundsatz-Entscheidungen. Die Freigabe merkt sich die High-Gründe statt des Commits und bleibt gültig, solange kein neuer Grund dazukommt. (2) Dispatcher (`dispatch.mjs`) und Planer (`planner.mjs`) sind Skripte mit `--dry-run`; die Workflows rufen sie nur auf. Der Planer lässt Claude `plan.json` schreiben, das Skript prüft (max. 5, Akzeptanzkriterien, Priorität, keine Duplikate) und legt die Issues an. (3) **Annahmen:** Linear-Schema (Filter, `inverseRelations`, `issueCreate`) aus dem Gedächtnis des GraphQL-Schemas, nicht live gegen die API geprüft; Auth, Middleware und Proxy bleiben als Pfad-Regel `risk:high` (Schwächung lässt sich dort nicht aus dem Diff lesen); große PRs und Forks: Fork bleibt high, Größe nicht mehr. Kosten, PostHog und Sentry im Planer nur mit Zugangsdaten, sonst „nicht verfügbar“. (4) **Workflow-Dateien:** Der Agent-Token darf `.github/workflows/` nicht ändern; `pr-gate.yml`, `dispatch.yml` und `planner.yml` liegen als Vorlagen in `docs/autonomy/` und müssen von Sinan nach `.github/workflows/` kopiert werden.
- **Warum:** Sinan soll nur noch bei echten Risiken freigeben; Arbeit läuft über Linear selbständig weiter.


### D-39 — Autonomie aktiviert: Dispatcher alle 30 Min, Budget, Vercel Hobby schonen

- **Links:** Linear [SIN-223](https://linear.app/sinan-kahraman/issue/SIN-223); Vercel [git-configuration (`github.autoJobCancelation`)](https://vercel.com/docs/project-configuration/git-configuration), [`ignoreCommand`](https://vercel.com/docs/project-configuration/vercel-json); [claude-code-action](https://github.com/anthropics/claude-code-action); [gitleaks v8.28.0](https://github.com/gitleaks/gitleaks/releases/tag/v8.28.0); D-36, D-38.
- **Entscheidung:** (1) `dispatch.yml` und `planner.yml` liegen jetzt in `.github/workflows/`; `pr-gate` nutzt `scripts/autonomy/risk.mjs` aus der Basis des PRs (kein PR-Code), gitleaks prüft nur die hinzugefügten Zeilen aus der API. `risk:low` entfällt. (2) Dispatcher läuft alle 30 Min, Concurrency je Workflow (`dispatch`, `planner`; Linear-Done/Blocker je PR in eigener Gruppe, damit sie nie hinter einem langen Lauf verworfen werden). (3) Budget: startet nur, wenn `AGENT_PAUSED_UNTIL` leer oder vergangen ist und weniger als 2 Issues laufen. Meldet Claude sein Limit, liest der Lauf den Reset-Zeitpunkt aus dem Log (Fallback +5 h), setzt die Variable und stellt das Issue auf Todo zurück. (4) Cursor zuerst: Claude übernimmt ein Todo nur mit Label `claude` oder wenn es seit 1 h unberührt ist und kein offener PR die Issue-ID nennt. (5) Vercel: `ignoreCommand` (`scripts/vercel-ignore.sh`) überspringt Previews für reine Doku/CI-Commits, `main` wird immer gebaut; überholte Commits eines PRs bricht Vercel mit `github.autoJobCancelation: true` ab (Standard, jetzt explizit). (6) `claude.yml` erlaubt zusätzlich `git fetch`, `git merge`, `git cherry-pick`.
- **Annahmen:** Cursor hat kein Guthaben-Signal, das der Dispatcher lesen kann; die 1-h-Wartezeit ersetzt es. Die Limit-Meldung von Claude hat keinen festen Vertrag; `pauseUntilFromLog` kennt Epoch- und Uhrzeit-Formate, sonst +5 h. Das Setzen von `AGENT_PAUSED_UNTIL` braucht das optionale Secret `AGENT_VARIABLES_TOKEN` (PAT, nur „Variables: write“); ohne es warnt der Lauf und Sinan setzt die Variable von Hand. Ein mehrstufiger Doku-PR wird je Commit geprüft: ein Code-Commit baut, ein späterer Doku-Commit nicht.
- **Warum:** Arbeit läuft selbständig weiter, ohne Limits zu verbrennen und ohne das Hobby-Kontingent von Vercel (100 Deployments/Tag) mit Doku-Previews zu füllen.


### D-40 — Gemeinsame MAF-Module: Modul-Bibliothek, nur M0 wird geteilt

- **Links:** Linear [SIN-217](https://linear.app/sinan-kahraman/issue/SIN-217); `supabase/migrations/20261005020000_ap20_shared_modules.sql`; `src/lib/content/shared-modules.ts`; `src/lib/learner/shared-path.ts`; D-30; D-37
- **Entscheidung:** (1) Neue Tabellen `shared_modules` (Schlüssel `maf:M0`, Quellkurs) und `course_shared_modules` (Kurs ↔ Modul), dazu `units.shared_module_key`. Einheiten liegen einmal im Quellkurs, andere Kurse verknüpfen sie; Fragen werden nie kopiert. Der Lernpfad (`GET /api/courses/{id}/lernpfad`) setzt eigene Einheiten und verknüpfte Module zusammen. (2) **Befund Neutralität** (Vergleich der 7 `maf-*.json`, Fingerabdruck je Modul plus Suche nach Schwerpunkt-Begriffen, Test `shared-modules.test.ts`): `M0` ist in allen 7 Maps identisch (Blöcke, Themen, Quellen, Fragenmix) und enthält keine Schwerpunkt-Begriffe → geteilt. `PA` ist **nicht** neutral: die Blöcke unterscheiden sich je Schwerpunkt (z. B. Druckverarbeitung: Papierverarbeitungsmaschinen, Bedruckstoffe; Metall: andere Blöcke und Umfang) → bleibt je Kurs eigen. `ZP`, `QS`, `WISO`, `SBP`, `APPT`, `APPP` sind Kandidaten; sie werden erst geteilt, wenn sie veröffentlicht sind und `checkSharedModule` sie als neutral meldet. (3) Migration legt die 6 Schwerpunkt-Kurse (Kunststoff, Lebensmittel, Packmittel, Textil, Textilveredelung, Druckverarbeitung) an und verknüpft `M0` mit allen 7 Kursen. 0 € API. (4) Generator: `phaseAChunks(…, publishedShared)` überspringt veröffentlichte Shared-Module. (5) **`WISO`/`SBP` für `indkfl.json`:** passt nicht. `WISO` ist dort ein anderes Modul (30 statt 40 Einheiten, andere Blöcke und Quellen `indkfl`/`rlp-indkfl`, Abschnitt B statt KMK-Profil); `SBP` gibt es in `indkfl.json` nicht. Keine Verknüpfung vorbereitet.
- **Abweichung vom Issue:** „M0 + PA in jedem Lernpfad“ gilt nur für M0. PA im Metall-Kurs (58 Einheiten) passt nicht zu den anderen Schwerpunkten; jeder Kurs bekommt sein eigenes PA, wenn er generiert wird.
- **Annahmen:** Quellkurs-ID `e22073de-7020-4380-9002-c70d46c25e25` aus `phase-a-index.json`; Einheiten-IDs von M0 beginnen mit `M0-` (Blockschema `M0-n-uk`). Das Skript, das Neutralität prüft, und die Migration laufen in dieser Umgebung nicht live (keine `node_modules`, kein Supabase-Zugang); Anwenden der Migration macht Sinan. Die Lernpfad-Seite der App liest weiter Phase A; die Umstellung auf `/api/courses/{id}/lernpfad` je Schwerpunkt folgt mit der Kurswahl.
- **Warum:** M0 (45 Einheiten) wird nicht 7-mal erzeugt und bewertet; Inhalte, die nicht neutral sind, würden sonst im falschen Schwerpunkt erscheinen.


### D-41 — Generator-Modell als Config (`GENERATOR_MODEL`), A/B Haiku 4.5 vs Sonnet 5.5

- **Links:** Linear [SIN-219](https://linear.app/sinan-kahraman/issue/SIN-219); [Pricing](https://platform.claude.com/docs/en/about-claude/pricing); [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing); [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching); `scripts/ap22-ab.ts`; `docs/ops/AP22-AB-HAIKU-SONNET.md`; D-06; D-33; D-37
- **Entscheidung:** (1) `GENERATOR_MODEL` ist per Env einstellbar (`resolveGeneratorModel`), erlaubt sind `claude-sonnet-5-5` (Default) und `claude-haiku-4-5-20251001`; unbekannte IDs werfen einen Fehler. (2) Batch-Preise je Modell stehen in `CLAUDE_BATCH_PRICES` (Sonnet 5.5 $1/$5, Haiku 4.5 $0,50/$2,50 je MTok; Cache-Schreiben 1,25×, Cache-Lesen 0,1×, laut Preisseite am 2026-10-05). (3) `submitChunkTargets` nimmt `model` und einen gecachten `system`-Präfix entgegen. (4) `npm run ap22:ab` startet 20 LF3-Einheiten je Modell als Batch, bewertet mit `gpt-5.4-mini`, misst `cache_read_input_tokens`, bricht über €3 ab und veröffentlicht nichts. (5) **Der Default bleibt Sonnet 5.5**, bis die Messung vorliegt.
- **Annahme:** Im Agent-Lauf fehlten `ANTHROPIC_API_KEY` und `OPENAI_API_KEY`; der Live-Lauf ist **nicht** erfolgt, es gibt keine Messwerte. Sinan startet `npm run ap22:ab` mit Keys und trägt das Ergebnis in den Bericht und hier ein. Wechsel auf Haiku nur, wenn die Bestehensquote die Schwelle aus D-33 hält. Ob der kurze Präfix die Mindestlänge für Caching erreicht, ist offen und wird gemessen.
- **Warum:** Haiku 4.5 kostet pro Token die Hälfte; ob die Qualität reicht, entscheidet nur eine Messung mit demselben Prompt und demselben Richter.
