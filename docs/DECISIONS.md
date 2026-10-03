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

- **Links:** [Models overview](https: