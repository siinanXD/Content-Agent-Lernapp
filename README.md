# Content-Agent-Lernapp

Lern-App, die aus einem Schlagwort (Pilot: Maschinen- und Anlagenführer) einen Kurs aus amtlichen Quellen erzeugt und aktuell hält.

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Konzept und Bauplan AP-00–AP-12
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architekturentscheidungen mit Links
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Runtime- und API-Überblick
- [`AGENTS.md`](AGENTS.md) — Entscheidungs- und Stopp-Regeln
- [`docs/content/README.md`](docs/content/README.md) — Curriculum-Maps (AP-13): MAF in allen fünf Schwerpunkten und Industriekaufleute 2024, Vorgabe für die Agenten
- [`docs/content/DIDAKTIK.md`](docs/content/DIDAKTIK.md) — Didaktik-Vorgabe (AP-18): Schablone je Einheit, Fragestufen, Wiederholung, Prüfungsmodus, Bilder
- [`docs/content/MAF-CURRICULUM.md`](docs/content/MAF-CURRICULUM.md) — Vorgängerversion v1 (nur Metall), abgelöst durch `docs/content/maf-metall.json`; bleibt, bis AP-14 (PR #20) auf den v2-Loader umgestellt ist

## Local development

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43123](http://127.0.0.1:43123) (`npm run dev` → port 43123).

### Learner UI (AP-08 + AP-18 Didaktik)

Playable path (Figma approved by Sinan 2026-10-02; Didaktik D-31):

1. `/` Start — Schlagwort + Lernvariante → Kurs erzeugen  
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
npm run test:lighthouse   # app must be running on :43123
npm run hermes:dry-run    # AP-10 scaffold (no live Telegram)
npm run pilot:maf         # AP-11 seed/fixture pipeline (app on :43123)
npm run build
npm run lint
```

A11y gates (axe critical/serious + Lighthouse a11y ≥ 0.9) run in CI via `.github/workflows/a11y.yml` and must not be disabled.

Ops / pilot docs: [`docs/ops/HERMES.md`](docs/ops/HERMES.md) · [`docs/pilot/MAF-PILOT.md`](docs/pilot/MAF-PILOT.md) · [`docs/learning/LOOP.md`](docs/learning/LOOP.md).

## Deploy

Vercel project pointed at this repo. Empty/scaffold build must succeed (AP-01).

## Secrets

Set in Vercel / local `.env.local` (never commit): Anthropic, OpenAI, Langfuse (EU), Supabase (EU). Work without keys uses mocks.

### Supabase persistence (AP-17)

- Migrations: `supabase/migrations/` (additive SQL + RLS). Runbook: [`docs/ops/SUPABASE.md`](docs/ops/SUPABASE.md).
- With `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: API routes persist via Supabase (service role, server-only).
- Without those secrets (or `COURSE_STORAGE=mock`): in-memory `mock-store` — tests stay green.
- Verify tables (when keys present): `npm run supabase:verify`.
- On this PR branch, regenerate the lockfile before `npm ci`: `npm run lock:assemble` (gzip chunks under `scripts/ap17-lock-chunks/`).

## Repo

https://github.com/siinanXD/Content-Agent-Lernapp

## AP-15 Phase A

```bash
npm run ap15:phase-a:dry
npm run ap15:phase-a
```

Artifacts land in `docs/ops/AP15-PHASE-A.md` and `docs/ops/ap15-runs/`.
