# Content-Agent-Lernapp

Lern-App, die aus einem Schlagwort (Pilot: Maschinen- und Anlagenführer) einen Kurs aus amtlichen Quellen erzeugt und aktuell hält.

## Stack (current)

| Layer | Choice |
| --- | --- |
| App | Next.js 16 + React 19 + TypeScript + Tailwind 4 |
| Hosting | Vercel |
| Persistence | Supabase EU (AP-17) with in-memory mock fallback |
| Quality / tracing | Langfuse Cloud EU — JS/TS SDK v5 / platform v4 OTEL ([SIN-197](https://linear.app/sinan-kahraman/issue/SIN-197)) |
| Ops scaffold | Hermes weekly source check + Telegram (AP-10/AP-16) |
| Models | Claude for generate (Batch); OpenAI mini as judge (D-06/D-07) |

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Konzept und Bauplan AP-00–AP-12
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architekturentscheidungen mit Links
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Runtime- und API-Überblick
- [`AGENTS.md`](AGENTS.md) — Entscheidungs- und Stopp-Regeln
- [`docs/content/README.md`](docs/content/README.md) — Curriculum-Maps (AP-13): MAF in allen fünf Schwerpunkten und Industriekaufleute 2024
- [`docs/content/DIDAKTIK.md`](docs/content/DIDAKTIK.md) — Didaktik-Vorgabe (AP-18): Schablone je Einheit, Fragestufen, Wiederholung, Prüfungsmodus, Bilder
- [`docs/content/MAF-CURRICULUM.md`](docs/content/MAF-CURRICULUM.md) — Vorgängerversion v1 (nur Metall); runtime loader uses `docs/content/maf-metall.json` via AP-14 ([PR #24](https://github.com/siinanXD/Content-Agent-Lernapp/pull/24))

## Local development

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43123](http://127.0.0.1:43123) (`npm run dev` → port 43123).

### Learner UI (AP-08 + AP-18 Didaktik)

Playable path (Figma approved by Sinan 2026-10-02; Didaktik D-31):

0. `/` Startseite für Bildungsträger (Scroll-Story), `/willkommen` App-Einstieg  
1. `/start` — Schlagwort + Lernvariante → Kurs erzeugen  
2. `/lernpfad` — Module/Blöcke, Wiederholung, Prüfungsmodus  
3. `/einheit/unit-03` — sections + alle 5 Fragetypen (+ Bildfragen)  
4. `/wiederholung` — Leitner 1/3/7/14  
5. `/pruefung` — schriftliche Teile aus `exam.gradedParts` (MAF PT/PP/WiSo)  
6. `/ergebnis` — Punkte + Ampel je Gebiet  
7. `/profil` — Fortschritt, Stapelgröße, Prüfungsreife  

Design source: [Figma](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz) · tokens in `docs/design/`. Phase-A SVGs: `npm run content:mermaid`.

```bash
npm test
npm run content:mermaid
npm run test:a11y
npm run test:lighthouse   # app must be running on :43123 (or add -- --serve)
npm run hermes:dry-run    # AP-10 scaffold (no live Telegram)
npm run pilot:maf         # AP-11 seed/fixture pipeline (app on :43123)
npm run supabase:verify   # when SUPABASE_* present
npm run build
npm run lint
```

A11y gates (axe über alle Routen, Tastatur, Lighthouse a11y ≥ 0.9) laufen im CI-Job `build` (`.github/workflows/ci.yml`) und dürfen nicht abgeschaltet werden.

## Qualität und Pflege (SIN-300)

| Was | Befehl / Workflow | Wirkung |
| --- | --- | --- |
| Leistungsbudget | `npm run build && npm run perf:budget -- --serve` · Grenzen in `performance-budget.json` | LCP (höchstens 2,5 s), CLS, TBT und JS-Größe je Route (Handy, Median aus 5 Läufen; `--details` zeigt das LCP-Element). Überschreitung macht `build` rot und blockiert den Merge. |
| Bildvergleich | `npm run visual -- --update-snapshots`, danach `npm run visual` · Workflow `visual.yml` | Handy- und Desktop-Bilder aller Seiten gegen main. Nur Hinweis (Lauf-Bericht, Artefakt `bildvergleich`), kein Gate; die Referenz kommt immer frisch aus main. |
| Aufräum-Agent | `npm run cleanup:scan` · Workflow `aufraeumen.yml` (montags) | Ungenutzte Dateien, tote Pakete, große Dateien, Doppelungen, Doku-Abgleich: ein PR pro Woche. |
| README-Erinnerung | `npm run readme:check` · Schritt im CI-Job `build` | Warnung, wenn ein PR Befehle, Seiten, Umgebungsvariablen oder Workflows ändert, ohne `README.md` anzufassen. |
| Changelog | `npm run changelog` (braucht volle Git-Historie) | [`CHANGELOG.md`](CHANGELOG.md) aus den Conventional-Commit-Titeln auf main, ohne KI. Erzeugt, nicht von Hand bearbeiten; der Aufräum-Lauf aktualisiert sie. |

Ops / pilot docs: [`docs/ops/HERMES.md`](docs/ops/HERMES.md) · [`docs/pilot/MAF-PILOT.md`](docs/pilot/MAF-PILOT.md) · [`docs/learning/LOOP.md`](docs/learning/LOOP.md) · [`docs/ops/SUPABASE.md`](docs/ops/SUPABASE.md).

## Phase A (AP-15)

First live course slice after the curriculum map: modules `M0`, `LF1`, `LF2`, `PA` (~280 units), generate with Claude Batch, judge with OpenAI mini, publish only through the quality gate. Tracked in [SIN-193](https://linear.app/sinan-kahraman/issue/SIN-193). Costs and scores should land in Langfuse Cloud EU — prefer completing the v4 cutover ([SIN-197](https://linear.app/sinan-kahraman/issue/SIN-197)) before relying on dashboards for that run.

```bash
npm run ap15:phase-a:dry
npm run ap15:phase-a
```

Artifacts land in `docs/ops/AP15-PHASE-A.md` and `docs/ops/ap15-runs/`.

## Deploy

Vercel project pointed at this repo. Empty/scaffold build must succeed (AP-01).

## Secrets

Set in Vercel / local `.env.local` (never commit): Anthropic, OpenAI, Langfuse (EU), Supabase (EU). Work without keys uses mocks.

Langfuse quality-gate tracing uses JS/TS SDK v5 / platform v4 OTEL ingestion (`docs/quality/README.md`).

### Supabase persistence (AP-17)

- Migrations: `supabase/migrations/` (additive SQL + RLS). Runbook: [`docs/ops/SUPABASE.md`](docs/ops/SUPABASE.md).
- With `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: API routes persist via Supabase (service role, server-only).
- Without those secrets (or `COURSE_STORAGE=mock`): in-memory `mock-store` — tests stay green.
- Verify tables (when keys present): `npm run supabase:verify`.

## Repo

https://github.com/siinanXD/Content-Agent-Lernapp

## Pull Requests

Jeder PR wird automatisch geprüft (`build`, `pr-title`, `merge-gate`). PRs mit `risk:low` oder `risk:medium` mergen von selbst, `risk:high` wartet auf das Label `freigegeben`. Details: `AGENTS.md`, Abschnitt „Pull Requests und Merge“. Hat Cursor kein Guthaben, übernimmt Claude: `@claude` in einem Issue-Kommentar.
