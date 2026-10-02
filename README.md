# Content-Agent-Lernapp

Lern-App, die aus einem Schlagwort (Pilot: Maschinen- und Anlagenführer) einen Kurs aus amtlichen Quellen erzeugt und aktuell hält.

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Konzept und Bauplan AP-00–AP-12
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architekturentscheidungen mit Links
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Runtime- und API-Überblick
- [`AGENTS.md`](AGENTS.md) — Entscheidungs- und Stopp-Regeln

## Local development

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43123](http://127.0.0.1:43123) (`npm run dev` → port 43123).

### Learner UI (AP-08 draft)

Playable path (Figma draft — **Sinan approval pending** on SIN-185):

1. `/` Start — Schlagwort + Lernvariante → Kurs erzeugen  
2. `/lernpfad` — heutige Einheiten  
3. `/einheit/unit-03` — Erklärung + Fragen  
4. `/ergebnis` — Punkte / Serie / weiter  
5. `/profil` — Fortschritt  

Design source: [Figma](https://www.figma.com/design/0SWGDO2ioBD3MyXiAnrbRz) · tokens in `docs/design/`.

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
