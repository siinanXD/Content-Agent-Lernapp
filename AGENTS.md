# AGENTS.md

Regeln für alle Agenten in diesem Repo. Diese Regeln ersetzen Rückfragen an Sinan.

## Zuerst lesen

1. `docs/PRODUCT.md` (Konzept, Arbeitspakete AP-00 bis AP-12)
2. `docs/DECISIONS.md` (Index der bisherigen Entscheidungen; Einzeldateien in `docs/decisions/`)
3. Das zugewiesene Linear-Issue

## Grundsatz

- KI erzeugt nur Inhalte. Bewertung von Lernenden und Zulassung macht ein Mensch.
- Ohne amtliche Quelle wird kein Lerninhalt erzeugt.

## Entscheidungsregeln (wörtlich aus PRODUCT.md)

### Vor jeder Entscheidung

1. Suche auf GitHub und Hugging Face nach einer fertigen Lösung
2. Lies die offiziellen Docs von Anthropic, OpenAI, Hermes oder Langfuse zum aktuellen Stand. Nutze nie Modellnamen oder Funktionen aus dem Gedächtnis
3. Schreibe die Entscheidung mit Links und einem Satz Begründung in `docs/decisions/<ISSUE-ID>-<kurz>.md` (eine Datei je Entscheidung, keine laufenden Nummern, SIN-240). `docs/DECISIONS.md` ist ein erzeugter Index: nie bearbeiten

### So wird entschieden

- Fertige Open-Source-Lösung vor Eigenbau, wenn: Lizenz MIT oder Apache, letzter Commit jünger als 6 Monate, mehr als 500 Sterne
- Das günstigste Modell, das die Qualitäts-Schwelle besteht
- Bei zwei gleich guten Wegen: der mit weniger Abhängigkeiten
- Nie zurückfragen. Bei Unsicherheit die Annahme in der Entscheidungsdatei (`docs/decisions/`) notieren und weiterarbeiten

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
2. Scope und Akzeptanzkriterien des Issues einhalten; Annahmen in `docs/decisions/<ISSUE-ID>-<kurz>.md` festhalten.
3. Branch: `cursor/<kurzname>-85a9` (Cursor) oder `claude/<kurzname>` (Claude). Pull Request öffnen. Gemerged wird automatisch, siehe „Pull Requests und Merge“.
4. Nach Merge Issue schließen und nächsten Block laut Bauplan starten.
5. Reihenfolge: AP-00 → AP-01 → AP-02 nacheinander; danach Pipeline (AP-03–AP-06) und App (AP-07–AP-09) parallel möglich; Hermes **AP-10** zuletzt unter Infra; **AP-11** Pilot; **AP-12** Lern-Schleife nach dem Pilot.
6. Blocker nach 3 PR-Reparatur-Runden oder bei fehlenden Secrets: kurz melden und mit Arbeit ohne Live-Keys weitermachen (Docs, Scaffold, Mocks, OpenAPI, Linear).

## Pull Requests und Merge (SIN-207)

- Ein PR pro Arbeitspaket (1 Linear-Issue = 1 PR). Reparaturen kommen in denselben PR, kein Folge-PR.
- Der Dispatcher (`dispatch.yml`, alle 2 h) startet das nächste Todo-Issue ohne offene Blocker, höchstens 2 parallel. Der Planer (`planner.yml`, sonntags) legt höchstens 5 Issues pro Woche an. Beide laufen mit `--dry-run` ohne Änderungen.
- PR-Titel = Commit auf `main` (Squash-Merge): Conventional Commit mit Linear-ID, z. B. `feat(lernpfad): Fortschrittsbalken (SIN-123)`. Der Check `pr-title` prüft das.
- Das Risiko setzt der Workflow `pr-gate` automatisch als Label `risk:medium` (Standard) oder `risk:high`. Nie selbst setzen oder entfernen. Die Regeln stehen in `scripts/autonomy/risk.mjs` (SIN-223).
  - `risk:medium`: Auto-Merge (Squash), sobald `build`, `pr-title` und `merge-gate` grün sind. Gilt auch für `.github/`, Migrationen (nur hinzufügen), `src/lib/storage/`, `.env.example`, `next.config.*`, `vercel.json`. Nicht selbst mergen.
  - `risk:high` nur bei: Secret-Leak (gitleaks, Werte in Env-Dateien); Datenverlust (`drop`, `delete`, `truncate`, `alter ... drop` in Migrationen, Änderung bestehender Migrationen); geschwächter Sicherheit (RLS, Auth, erweiterte Workflow-`permissions`); Zahlungen; Grundsatz-Entscheidungen (`docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, Framework/DB/Hosting-Wechsel, `docs/design/`). Wartet, bis Sinan das Label `freigegeben` setzt. Die Freigabe bleibt bei Folge-Commits bestehen, außer ein neuer Commit bringt einen neuen High-Grund.
  - Label `no-automerge` stoppt den Auto-Merge für einen PR.
- `build` prüft Lint, Typecheck, Unit-Tests, Build, Playwright-Smoke und axe-core.
- Vor dem Push: `git fetch origin main && git merge origin/main`, dann `npm ci`, Typecheck, Lint und Tests. Kein PR mit bekannten roten Checks (SIN-240).
- Alles, was PRs anlegt, pusht, labelt oder mergt, läuft mit `AGENT_WORKFLOW_TOKEN`, nie mit `github.token` (dessen Ereignisse lösen keine Folge-Workflows aus).
- Rote CI: Der Workflow `repair` lässt Claude bis zu 3 Runden reparieren (Labels `repair:1` bis `repair:3`), danach Label `needs-human` und Stopp.
- Workflows: In github-script@v7 nie `getOctokit` verwenden (nicht definiert). Stattdessen `new github.constructor({ auth: process.env.AGENT_TOKEN })`.

## Technik (siehe DECISIONS.md)

- App: Next.js auf Vercel
- Daten: Supabase, Region EU (bevorzugt Frankfurt)
- Pipeline: eigene API-Routen; Hermes-Worker auf Railway (AP-10)
- Tracing und Bewertung: Langfuse Cloud EU
- API-Vertrag: OpenAPI im Repo, Postman-Collection daraus
- Design: Figma ist die einzige Quelle für Farben, Abstände und Komponenten

## Design: Figma zuerst (SIN-239)

- **Ohne Design-Issue erlaubt:** Änderungen, die nur vorhandene Figma-Komponenten und Tokens nutzen (Zustände, Texte, Abstände, Varianten bestehender Screens, Fehler-/Leer-/Ladezustände nach Screen 17).
- **Design-Issue nötig:** neue Screens, neue Komponenten, neue Farben/Tokens, geänderte Navigation.
- Der Planer bündelt alle Design-Issues zu höchstens einem Design-Paket pro Woche (Label `design`, Backlog bis Sinan die Sitzung macht).
- Agenten erfinden keine neuen Komponenten im Code. Fehlt etwas, legen sie ein Design-Issue an, statt zu improvisieren.
- Werte (Farben, Abstände, Texte) für Frontend-Issues aus Figma lesen, nicht schätzen: `node scripts/autonomy/figma.mjs --node <ID>` (Datei `0SWGDO2ioBD3MyXiAnrbRz`, Token `FIGMA_ACCESS_TOKEN` nur lesend). Fehlt der Token, im Bericht „nicht verfügbar“ schreiben.

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
