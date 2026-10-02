# Content-Agent-Lernapp

Lern-App, die aus einem Schlagwort (Pilot: Maschinen- und Anlagenführer) einen Kurs aus amtlichen Quellen erzeugt und aktuell hält.

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Konzept und Bauplan AP-00–AP-12
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architekturentscheidungen mit Links
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Runtime- und API-Überblick
- [`docs/design/FIGMA.md`](docs/design/FIGMA.md) — Design-System / Screens
- [`AGENTS.md`](AGENTS.md) — Entscheidungs- und Stopp-Regeln

## Local development

```bash
npm install
npm run dev
```

Dev server defaults to an uncommon port in scripts (see `package.json`). Open the printed URL.

Learner screens (AP-08):

- `/` Start
- `/lernpfad` Path
- `/einheit/[unitId]` Unit
- `/ergebnis` Result
- `/profil` Profile

```bash
npm test
npm run build
npm run lint
```

## Deploy

Vercel project pointed at this repo. Empty/scaffold build must succeed (AP-01).

## Secrets

Set in Vercel / local `.env.local` (never commit): Anthropic, OpenAI, Langfuse (EU), Supabase (EU). Work without keys uses mocks.

## Repo

https://github.com/siinanXD/Content-Agent-Lernapp
