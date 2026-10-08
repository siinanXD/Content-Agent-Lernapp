# Repo-Landkarte

Wo liegt was. Zuerst lesen, dann gezielt öffnen statt das Repo zu durchsuchen (SIN-320). Halten aktuell: der Aufräum-Agent (`aufraeumen.yml`, montags). Stimmt hier etwas nicht mehr, im selben PR korrigieren. Höchstens 150 Zeilen.

## Grundsätze

- KI erzeugt nur Inhalte; Bewertung und Zulassung macht ein Mensch. Ohne amtliche Quelle kein Lerninhalt.
- Regeln und Stopp-Regeln: `AGENTS.md`. Konzept und Arbeitspakete: `docs/PRODUCT.md`. Entscheidungen: `docs/decisions/<ISSUE-ID>-<kurz>.md`, Index `docs/DECISIONS.md` (erzeugt, nie von Hand).
- Fehler nicht doppelt machen: `docs/autonomy/LEHREN.md` lesen, nach jedem behobenen Bug eine Zeile ergänzen.
- Next.js ist hier neuer als im Training: vor Code in `node_modules/next/dist/docs/` nachlesen.

## App (Next.js, Vercel)

| Was | Wo |
| --- | --- |
| Seiten und API-Routen | `src/app/` (z. B. `lernpfad`, `einheit`, `pruefung`, `ausbilder`, `api/*`) |
| Komponenten | `src/components/` (`ui` Grundbausteine, `learner`, `a11y`, `analytics`) |
| Fachlogik | `src/lib/` (`learner` inkl. Filter verworfener Fragen `discarded.ts`, `learning`, `plan`, `pipeline`, `generate`, `quality`, `storage`, `auth`, `legal`) |
| Recht-und-Inhalt-Wächter, Verbotsliste | `src/lib/review/` (`content-guard.ts` vor `publish`, `regeln.ts`) |
| Speicher | `src/lib/storage/` (Supabase EU, Mock-Fallback bei `COURSE_STORAGE=mock`) |
| Datenbank | `supabase/migrations/` (nur hinzufügen, nie bestehende ändern) |
| Lerninhalte | `docs/content/` (Curriculum-Maps), `content/legal/` |
| Umgebung | `.env.example`, `docs/ENV.md`, `src/lib/env.ts` |

## Pipeline und Qualität

| Was | Wo |
| --- | --- |
| Erzeugen, Prüfen, Richter | `src/lib/generate/`, `src/lib/quality/`, `src/lib/anthropic/` |
| Langfuse: Namen, Session, Scores, Queue, Dashboard (SIN-299) | `src/lib/quality/langfuse-names.ts`, `langfuse-verwaltung.ts`, `scripts/langfuse-setup.ts`, `docs/ops/langfuse-dashboard.md` |
| Langfuse: ein Trace je Einheit mit Fragen und Bewertung (SIN-383) | `src/lib/quality/unit-traces.ts`, `grow-traces.ts`, Test `grow-traces.test.ts` |
| Hermes (Quellen-Monitor) | `src/lib/hermes/`, `docs/ops/HERMES.md` |
| Skripte (Kurslauf, Goldset, Pilot) | `scripts/*.ts`, `scripts/*.mjs` |
| API-Vertrag | `docs/api/openapi.yaml`, `docs/api/postman-collection.json` |

## Autonomie (Loop)

| Was | Wo |
| --- | --- |
| Workflows | `.github/workflows/` (`dispatch`, `worker`, `repair`, `planner`, `pr-gate`, `post-merge`, `digest`, `status`, `aufraeumen`, …) |
| Skripte der Workflows | `scripts/autonomy/` (`dispatch`, `linear`, `planner`, `risk`, `steckbrief`, `digest`, `sparen`, `verbrauch`, …) |
| Diagramme als Mermaid (SIN-376, Quelle für FigJam) | `docs/diagramme/pipeline.mmd`, `nutzerwege.mmd`; Hinweis im PR-Steckbrief (`diagrammHinweis`) |
| Vorlagen und Konfiguration | `docs/autonomy/` (`README.md`, `groessen.md`, `tokens.md`, Fixtures) |
| Review-Agent (zweites Modell, SIN-297) | `.github/workflows/review.yml`, `scripts/autonomy/review.mjs` |
| Codeanalyse, Paket-Updates | `.github/workflows/codeql.yml`, `scripts/autonomy/codeql-gate.mjs`, `.github/dependabot.yml` |
| Konflikte in erzeugten Dateien (Index, CHANGELOG) ohne KI | `scripts/autonomy/konflikt.mjs` (Wächter `status.yml`, `repair.yml`) |
| Lehren, Skills, Laufprotokoll (SIN-296) | `docs/autonomy/LEHREN.md`, `docs/skills/`, `scripts/autonomy/protokoll.mjs` |
| Trend-Radar (SIN-313, wöchentlich) | `.github/workflows/trend-radar.yml`, `scripts/autonomy/trend-radar.mjs`, Berichte `docs/research/trend-radar-*.md` |
| Aufgaben für Sinan als Linear-Issues, Label `sinan` (SIN-310) | `scripts/autonomy/sinan.mjs` (`create`, `sync`, `SEED`), Tages-Update und Status-Seite zeigen sie unter „Braucht dich“ |
| Migrationen automatisch anwenden, Wächter „n/n“ (SIN-374) | `.github/workflows/migrate.yml`, `scripts/autonomy/migrationen.mjs`, Aufgabe `migrate` in `run-task.mjs` |
| Live-Kommentare des Workers in Linear (SIN-298) | `scripts/autonomy/live.mjs` (`gestartet`, `fortschritt`, `frage`, `fertig`, `gescheitert`) |
| Figma-Abdeckung Frame → Route (SIN-349) | `docs/quality/figma-abdeckung.json`, Bericht `figma-abdeckung.md`, Prüfung `scripts/autonomy/figma-abdeckung.mjs` (`npm run figma:abdeckung`) |
| Projekt-Starter, nur Plan (SIN-202) | `scripts/autonomy/starter.mjs` (`plan`, `sql`), Entscheidung `docs/decisions/SIN-202-projekt-starter.md` |
| Risiko-Regeln | `scripts/autonomy/risk.mjs` (Gate selbst: nur mit Freigabe ändern) |
| Größen, Modell, Runden, Bündeln, Verbrauch | `docs/autonomy/groessen.md`, `scripts/autonomy/sparen.mjs` |

## Tests

| Was | Wo | Befehl |
| --- | --- | --- |
| Unit | `src/**/*.test.ts` (auch für `scripts/autonomy`: `src/lib/autonomy/`) | `npm test` |
| Barrierefreiheit, Smoke | `e2e/` | `npm run test:a11y` |
| Live-Check nach Deploy | `live/`, `docs/ops/live-checkliste.md` | `npm run live:local` |
| Bildvergleich | `visual/` | `npm run visual` |
| Leistungsbudget | `performance-budget.json` (Grenzen nie anheben) | `npm run perf:budget` |

## Design

- Figma ist die einzige Quelle für Farben, Abstände und Komponenten (Datei `0SWGDO2ioBD3MyXiAnrbRz`): `node scripts/autonomy/figma.mjs --node <ID>`.
- Tokens: `docs/design/tokens.json`, im Code nur `var(--color-*)` (`src/app/globals.css`), nie Hex. Regeln: `docs/design/regeln-2026.md`, `docs/skills/web-design-guidelines/SKILL.md`.
- Neue Screens, Komponenten, Farben: Linear-Issue mit Label `design`, nicht im Code erfinden.

## Wichtigste Befehle

```bash
npm ci                      # Pakete
npm run dev                 # lokal, Port 43123
npm run typecheck && npm run lint && npm test   # vor jedem Push
npm run build               # Produktionsbuild
npm run decisions:index     # Entscheidungs-Index neu erzeugen (committen)
npm run changelog           # nie von Hand: CHANGELOG.md ist erzeugt
npm run autonomy:dispatch:dry   # Dispatcher mit Fixture, ohne Linear
```

## So liest du Langfuse

1. Langfuse → Sessions → `kurslauf-…` öffnen: das ist ein Kurslauf; jede Zeile darin ist eine Einheit (`M3 · 02 Spannmittel`), Tags zeigen Modul und Lauf-Art.
2. Eine Einheit anklicken: „Erzeugen“ zeigt Modell, Tokens, Kosten und die erzeugten Fragen; „Ergebnis“ sagt veröffentlicht oder verworfen mit Grund.
3. „Prüfen · Frage n“ anklicken: Fragetext, richtige Antwort, Begründung des Richters und die Scores je Prüfpunkt (`bestanden` ja/nein). Zusammenfassung: Dashboard „Kurslauf: Kosten und Qualität“ (`docs/ops/langfuse-dashboard.md`).

## Konventionen

- Branch `claude/<kurzname>`; ein Linear-Issue = ein PR; Reparaturen im selben PR (höchstens 3 Runden).
- PR-Titel: Conventional Commit mit Kennung, z. B. `feat(lernpfad): Fortschrittsbalken (SIN-123)`. Body beginnt mit `Part of SIN-123`, danach `## Was ändert sich`, `## Ausprobieren`, `## Nach dem Merge`.
- Vor dem Push: `git fetch origin main && git merge origin/main`, dann `npm ci`, Typecheck, Lint, Tests.
- Texte deutsch, kurz, konkret. Keine Emojis, keine Platzhalter, keine erfundenen Zahlen.
- Ändern sich Funktion, Einrichtung, Befehle oder Umgebungsvariablen: `README.md` im selben PR.
- Nie anfassen: Zugangsdaten, Abrechnung, Datenbank-Löschungen. Mechanik (Index, Labels, Changelog, Konflikte in erzeugten Dateien) machen Skripte, kein Claude-Lauf.
