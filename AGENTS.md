# AGENTS.md

Regeln für alle Agenten in diesem Repo. Diese Regeln ersetzen Rückfragen an Sinan.

## Zuerst lesen

1. `docs/PRODUCT.md` (Konzept, Arbeitspakete AP-00 bis AP-12)
2. `docs/DECISIONS.md` (bisherige Entscheidungen)
3. Das zugewiesene Linear-Issue

## Grundsatz

- KI erzeugt nur Inhalte. Bewertung von Lernenden und Zulassung macht ein Mensch.
- Ohne amtliche Quelle wird kein Lerninhalt erzeugt.

## Entscheidungsregeln (wörtlich aus PRODUCT.md)

### Vor jeder Entscheidung

1. Suche auf GitHub und Hugging Face nach einer fertigen Lösung
2. Lies die offiziellen Docs von Anthropic, OpenAI, Hermes oder Langfuse zum aktuellen Stand. Nutze nie Modellnamen oder Funktionen aus dem Gedächtnis
3. Schreibe die Entscheidung mit Links und einem Satz Begründung in docs/DECISIONS.md

### So wird entschieden

- Fertige Open-Source-Lösung vor Eigenbau, wenn: Lizenz MIT oder Apache, letzter Commit jünger als 6 Monate, mehr als 500 Sterne
- Das günstigste Modell, das die Qualitäts-Schwelle besteht
- Bei zwei gleich guten Wegen: der mit weniger Abhängigkeiten
- Nie zurückfragen. Bei Unsicherheit die Annahme in docs/DECISIONS.md notieren und weiterarbeiten

### Stopp-Regeln

- Höchstens 3 Reparatur-Runden pro Pull Request, dann stoppen und den Blocker melden
- Höchstens 20 Euro API-Kosten pro Kurslauf, dann stoppen

### Verboten

- IHK-Prüfungsaufgaben kopieren
- Personendaten in Prompts
- Inhalte unter der Qualitäts-Schwelle veröffentlichen
- Zugangsdaten, Abrechnung oder Datenbank-Löschungen anfassen
- Barrierefreiheits-Tests abschalten, um einen Merge durchzubekommen

## Linear-Issues bearbeiten

1. Issue starten (In Progress) / zuweisen, bevor Code geschrieben wird — zuerst **AP-00**.
2. Scope und Akzeptanzkriterien des Issues einhalten; Annahmen in `docs/DECISIONS.md` festhalten.
3. Branch: `cursor/<kurzname>-85a9` (Cursor) oder `claude/<kurzname>` (Claude). Pull Request öffnen. Gemerged wird automatisch, siehe „Pull Requests und Merge“.
4. Nach Merge Issue schließen und nächsten Block laut Bauplan starten.
5. Reihenfolge: AP-00 → AP-01 → AP-02 nacheinander; danach Pipeline (AP-03–AP-06) und App (AP-07–AP-09) parallel möglich; Hermes **AP-10** zuletzt unter Infra; **AP-11** Pilot; **AP-12** Lern-Schleife nach dem Pilot.
6. Blocker nach 3 PR-Reparatur-Runden oder bei fehlenden Secrets: kurz melden und mit Arbeit ohne Live-Keys weitermachen (Docs, Scaffold, Mocks, OpenAPI, Linear).

## Pull Requests und Merge (SIN-207)

- 1 Linear-Issue = 1 PR. Klein halten: lieber zwei PRs als einen großen.
- PR-Titel = Commit auf `main` (Squash-Merge): Conventional Commit mit Linear-ID, z. B. `feat(lernpfad): Fortschrittsbalken (SIN-123)`. Der Check `pr-title` prüft das.
- Das Risiko setzt der Workflow `pr-gate` automatisch als Label `risk:low`, `risk:medium` oder `risk:high`. Nie selbst setzen oder entfernen.
  - `risk:low` und `risk:medium`: Auto-Merge (Squash), sobald `build`, `pr-title` und `merge-gate` grün sind. Nicht selbst mergen.
  - `risk:high` (`.github/`, `supabase/migrations/`, Auth, Middleware/Proxy, Env/Secrets, `vercel.json`, `next.config.*`, `src/lib/storage/`, Zahlungen, sehr große PRs): wartet, bis Sinan das Label `freigegeben` setzt. Neue Commits heben die Freigabe auf.
  - Label `no-automerge` stoppt den Auto-Merge für einen PR.
- `build` prüft Lint, Typecheck, Unit-Tests, Build, Playwright-Smoke und axe-core.
- Rote CI: Der Workflow `repair` lässt Claude bis zu 3 Runden reparieren (Labels `repair:1` bis `repair:3`), danach Label `needs-human` und Stopp.

## Technik (siehe DECISIONS.md)

- App: Next.js auf Vercel
- Daten: Supabase, Region EU (bevorzugt Frankfurt)
- Pipeline: eigene API-Routen; Hermes-Worker auf Railway (AP-10)
- Tracing und Bewertung: Langfuse Cloud EU
- API-Vertrag: OpenAPI im Repo, Postman-Collection daraus
- Design: Figma ist die einzige Quelle für Farben, Abstände und Komponenten

## Qualität

- Jeder Pull Request: Tests grün, axe-core und Lighthouse ohne Fehler.
- Barrierefreiheit: WCAG 2.2 Stufe AA, Kontrast mindestens 4,5 zu 1, komplett per Tastatur bedienbar.
- Jede Lerneinheit speichert Quelle und Abrufdatum.
- Zugangsdaten nie ins Repo (öffentlich).

## Claude als Ersatz-Agent (SIN-205)

- Cursor zuerst. Hat Cursor kein Guthaben, setze das Label `claude` auf das Issue oder kommentiere `@claude`.
- Der Workflow `.github/workflows/claude.yml` startet Claude (`claude-code-action@v1`, nur für Nutzer mit Schreibrechten).
- Draft-PR nur, solange du noch arbeitest. Fertig und lokal geprüft: auf „Ready for review" stellen. Draft-PRs werden nie automatisch gemerged.
- Nie selbst mergen. Das übernimmt der Auto-Merge (siehe Abschnitt Pull Requests und Merge).
- Commit-Nachrichten enthalten `Part of SIN-xxx` (die Issue-Nummer des Auftrags).
- Maximal 3 Reparaturrunden pro Pull Request, dann stoppen und den Blocker melden.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
