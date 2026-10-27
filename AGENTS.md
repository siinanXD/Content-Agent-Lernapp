# AGENTS.md

## Verbindliche Grundregel (SIN-840)

**Grundregel:** Ein freigegebener Auftrag umfasst Diagnose, Umsetzung, Prüfungen und notwendige Nacharbeit innerhalb seines Umfangs. Vor Abschluss werden die neuesten Anforderungen erneut gelesen und unabhängig gegen konkrete Belege geprüft. Rückfragen erfolgen nur bei einer neuen Entscheidung oder einer erreichten Ausführungsgrenze.

## Die fünf Regeln (verbindlich für Worker, Prüfer, Abschluss)

1. **Vor dem Start den Auftrag aktualisieren.** Worker liest Issue inkl. neuester Kommentare, Masterauftrag, vorhandene PRs, relevante Register (rollen.json, agents.json, abnahme.yml). Ändern sich Kriterien während der Arbeit: vor Merge erneuter Abgleich.
2. **Behauptungen zuerst gegen Belege prüfen.** Vor einer Reparatur vorhandene Logs/loop_events lesen und Ursache eingrenzen. Diagnose gehört in den bestehenden Auftrag, nicht in ein neues Issue.
3. **Begrenzte Reparaturen automatisch.** Innerhalb des freigegebenen Auftrags darf der Worker Code, Regressionstests und Doku korrigieren und vorhandene Prüfungen ausführen. Höchstens zwei erfolglose Reparaturrunden, dann Stopp mit konkretem Blocker. Kein Extra-Issue für kleine Fixes.
4. **Abschluss unabhängig prüfen.** Der Codex-Review gleicht jedes aktuelle Fertig-Kriterium mit einem Beleg ab: Commit, Workflow-Lauf, gespeichertes Ergebnis (Supabase-Zeile) oder Live-Ausgabe (Vercel, Screenshot). Fehlender Beleg hält das Issue offen und wird im selben PR nachgeholt. „PR gemergt“ reicht nicht.
5. **Nur echte Entscheidungen an Sinan.** Rückfrage bei neuen Kosten, Secrets, Rechten, Löschungen, wesentlich geändertem Umfang, vorbehaltenen Produktionsaktionen, Entfernen von Workflows oder Pflicht-Checks. Routinefehler laufen innerhalb der Freigabe. Ablauf siehe „Entscheidungen an Sinan“. Meldung an Sinan kurz: erledigt / belegt / blockiert.

Diese Regeln haben Vorrang vor älteren Wiederholungs- und Abschlussregeln. Fehlender Beleg: kein Merge, In Progress. „Part of“: nie Done.


Regeln für alle Agenten in diesem Repo. Diese Regeln ersetzen Rückfragen an Sinan.

**Arbeitsweise seit 27.10.2026 (Leitstand 2.0, SIN-1104, SIN-1117):** Ein T3-Chat bearbeitet ein Linear-Issue: ein Issue, ein Branch, ein PR. Das Gate ist `build` plus Codex-Review. Der alte Loop (Dispatcher, Planer, Worker, Repair, Prüfer-Workflows, Labels `repair:*`, `einspruch:*`, `pruefer:*`) ist abgeschaltet und hier nicht mehr beschrieben.

## Zuerst lesen

1. `docs/LANDKARTE.md` (wo liegt was, wichtigste Befehle, Konventionen; spart Suchen)
2. `docs/PRODUCT.md` (Konzept, Arbeitspakete AP-00 bis AP-12)
3. `docs/DECISIONS.md` (Index der bisherigen Entscheidungen; Einzeldateien in `docs/decisions/`)
4. `docs/autonomy/LEHREN.md` (Fehler, die schon passiert sind, und wie es richtig geht; SIN-296)
5. Das zugewiesene Linear-Issue

## Grundsatz

- KI erzeugt nur Inhalte. Bewertung von Lernenden und Zulassung macht ein Mensch.
- Ohne amtliche Quelle wird kein Lerninhalt erzeugt.

## Entscheidungsregeln (wörtlich aus PRODUCT.md)

### Vor jeder Entscheidung

1. Suche auf GitHub und Hugging Face nach einer fertigen Lösung
2. Lies die offiziellen Docs von Anthropic, OpenAI, Hermes oder Langfuse zum aktuellen Stand. Nutze nie Modellnamen oder Funktionen aus dem Gedächtnis. Für Next.js, Supabase, Anthropic/OpenAI SDK, Playwright, Revideo usw. zuerst Context7 fragen (MCP `mcp__context7__*`), sonst die offizielle Doku per WebFetch; Quelle im PR nennen (SIN-537)
3. Bei Design/UX: Figma Community nach Vorlagen durchsuchen (User Flow, Journey Map, UI-Kits, Device Mockups, Präsentation). Treffer mit Link, Lizenz/Nutzungsbedingungen und Begründung in `docs/decisions/` festhalten. Agenten können Community-Dateien nicht selbst übernehmen: Sinan muss sie per Klick kopieren (Hinweis im Design-Paket, SIN-306)
4. Schreibe die Entscheidung mit Links und einem Satz Begründung in `docs/decisions/<ISSUE-ID>-<kurz>.md` (eine Datei je Entscheidung, keine laufenden Nummern, SIN-240). `docs/DECISIONS.md` ist ein erzeugter Index: nie bearbeiten

### So wird entschieden

- Fertige Open-Source-Lösung vor Eigenbau, wenn: Lizenz MIT oder Apache, letzter Commit jünger als 6 Monate, mehr als 500 Sterne
- Das günstigste Modell, das die Qualitäts-Schwelle besteht
- Bei zwei gleich guten Wegen: der mit weniger Abhängigkeiten
- Nur bei echten Entscheidungen zurückfragen (Grundregel Nr. 5). Bei Unsicherheit die Annahme in der Entscheidungsdatei (`docs/decisions/`) notieren und weiterarbeiten

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

1. Issue samt neuesten Kommentaren lesen und auf In Progress setzen, bevor Code geschrieben wird.
2. Scope und Akzeptanzkriterien des Issues einhalten; Annahmen in `docs/decisions/<ISSUE-ID>-<kurz>.md` festhalten.
3. Ein Issue → ein Branch `sin-<nr>-<kurzname>` → ein PR. Kein `claude/`- oder `codex/`-Präfix: dort verlangt `merge-gate` noch den alten Prüfer-Beleg (`scripts/autonomy/beleg-gate.mjs`) und bleibt rot. Gemerged wird automatisch, siehe „Pull Requests und Merge“.
4. Nach Merge setzt Leitstand 2.0 das Issue auf Done. Reihenfolge und Nachziehen neuer Issues macht sein Planer (SIN-1116).
5. Blocker nach 3 PR-Reparatur-Runden oder bei fehlenden Secrets: als Linear-Kommentar melden und mit Arbeit ohne Live-Keys weitermachen (Docs, Scaffold, Mocks, OpenAPI, Linear).

## Pull Requests und Merge (SIN-207)

- Ein PR pro Arbeitspaket (1 Linear-Issue = 1 PR). Reparaturen kommen in denselben PR, kein Folge-PR.
- PR-Titel = Commit auf `main` (Squash-Merge): Conventional Commit mit Linear-ID, z. B. `feat(lernpfad): Fortschrittsbalken (SIN-123)`. Der Check `pr-title` prüft das. Teilschritte tragen `Part of SIN-xxx` im Commit, ein Part-Of-PR schließt das Issue nie.
- Das Risiko setzt der Workflow `pr-gate` automatisch als Label `risk:low` (Standard), `risk:medium` oder `risk:high`. Nie selbst setzen oder entfernen. Die Regeln stehen in `scripts/autonomy/risk.mjs` (SIN-223).
  - `risk:low` (Standard, SIN-811): Auto-Merge (Squash) ohne Frist, sobald `build`, `pr-title` und `merge-gate` grün sind. Gilt für Design-Tokens und Komponenten aus Figma, Docs, Tests, Migrationen (nur hinzufügen), `src/lib/storage/`, `.env.example`, `next.config.*`, `vercel.json` und neue npm-Pakete mit MIT/Apache und mehr als 500 Sternen. Nicht selbst mergen. `revert-guard` ist abgeschaltet: wird CI auf `main` rot, sofort im Chat und im Issue melden.
  - **Aufbauphase (SIN-855, Sinan 19.10.2026): keine Einspruchsfrist.** `risk:low` und `risk:medium` mergen nach grünen Pflicht-Checks; `risk:high`, `no-automerge` und Draft sperren weiter. Schalter `AUFBAUPHASE` in `scripts/autonomy/risk.mjs`, zurück erst nach belegter Produktreife und Workflow-Abnahme.
  - `risk:medium` mit **Einspruchsfrist 30 Min** (nach der Aufbauphase; SIN-547, SIN-811, Label `einspruch:30m`): jede Workflow-Änderung (auch Schritte, Skripte, Zeitpläne), `permissions:`/Secrets in YAML, `write`-Rechte, `allowedTools`/`allowed_bots`, bekannte Secrets und Actions von `actions/*`, `anthropics/*` und den Owners in `docs/autonomy/config.json` (`ERLAUBTE_ACTION_OWNER`); das Gate selbst (`pr-gate.yml`, `dispatch.yml`, `scripts/autonomy/risk.mjs`); Framework/DB-Wechsel. Auto-Merge erst nach der Frist (Kommentar `pr-gate-einspruch`, `merge-gate` bis dahin rot), Sinan stoppt mit `no-automerge`.
  - `risk:high` nur bei: Secret-Leak (gitleaks, Werte in Env-Dateien); Datenverlust (`drop`, `delete`, `truncate`, `alter ... drop`/`rename` in Migrationen, Änderung bestehender Migrationen); Sicherheit (RLS, Auth/Middleware, Service-Role-Key im Client, Branch-Protection, Fork); Geld (Stripe-Live-Schalter, Preise, neue kostenpflichtige Dienste); `pull_request_target`, neuen Secrets und Drittanbieter-Actions außerhalb der Liste; `docs/PRODUCT.md`; neuen npm-Paketen ohne MIT/Apache oder unter 500 Sternen. Wartet, bis Sinan das Label `freigegeben` setzt. Die Freigabe bleibt bei Folge-Commits bestehen, außer ein neuer Commit bringt einen neuen High-Grund.
  - Label `no-automerge` stoppt den Auto-Merge für einen PR.
- `build` prüft Lint, Typecheck, Unit-Tests, Build, Playwright-Smoke und axe-core.
- Vor dem Push: `git fetch origin main && git merge origin/main`, dann `npm ci` und `npm run check:fast` (Lint und Typecheck parallel, dann Unit-Tests, ohne Keys, ca. 1,5–2 Min., SIN-875). Erst bei grün pushen; rot → reparieren (höchstens zwei Runden, SIN-840). Kein PR mit bekannten roten Checks (SIN-240). Dieselbe Prüfung läuft in `ci`; Build, Playwright, axe und Lighthouse bleiben dort das Tor.
- Alles, was PRs anlegt, pusht, labelt oder mergt, läuft mit `AGENT_WORKFLOW_TOKEN`, nie mit `github.token` (dessen Ereignisse lösen keine Folge-Workflows aus).
- Rote CI: im selben PR reparieren, höchstens 3 Runden, danach Stopp und Blocker als Linear-Kommentar. Der Workflow `repair` (Labels `repair:*`) ist abgeschaltet.
- Workflows: In github-script@v7 nie `getOctokit` verwenden (nicht definiert). Stattdessen `new github.constructor({ auth: process.env.AGENT_TOKEN })`.

## Fertig-Liste: v1 zuerst, Ideen nach und nach (SIN-528)

- Die Produktbeschreibung ist das **Grundgerüst** (Linear-Meilenstein „v1 Grundgerüst“). Ideen, die beim Bauen dazukommen, werden sichtbar markiert (Label `idee`, Meilenstein „v2 Ideen“, Backlog) und nach und nach aufgenommen.
- Reihenfolge und Nachziehen der Issues steuert der Planer in Leitstand 2.0 (SIN-1116), nicht dieses Repo. Agenten setzen `dringend` nie selbst.

## Entscheidungen an Sinan (SIN-1117)

- Braucht ein Agent eine Entscheidung (Kosten, Secrets, Rechte, Löschen, Workflow oder Pflicht-Check entfernen, Konto/Vertrag/Token): Label `entscheidung` auf das Issue, Frage mit Optionen und Empfehlung als Linear-Kommentar, dieselbe Frage im Chat, dann auf die Antwort warten. Die Anleitung steht nicht im PR-Text.
- Arbeit, die ohne die Antwort möglich ist, läuft weiter.

## Done heißt live (SIN-616)

- Ein Linear-Issue darf nur auf „Done“, wenn die Funktion läuft (Workflow aktiv, Migration angewendet, Secret gesetzt), nicht nur, wenn Code oder eine Vorlage gemergt ist.
- Bleibt etwas für Sinan, steht es als Kommentar im Issue (bei einer Entscheidung mit Label `entscheidung`, siehe oben) und der PR verlinkt es. Das Original bleibt bis dahin „In Review“.
- Fehlende Secrets bündelt der Agent in einen einzigen Kommentar (bis SIN-611 sie aus Infisical holt).
- Kein Done ohne grüne Abnahme-Probe (SIN-626): Jedes Issue bekommt beim Bauen mindestens eine Probe in `docs/abnahme.yml` des Leitstands (HTTP, lesende Abfrage, Datei-Check) mit erwartetem Ergebnis. Erst wenn sie im stündlichen Lauf grün ist, geht das Linear-Issue auf „Done“.

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

### Anti-Slop (SIN-243, Stil E)

- Stil E: Orange, Weiß, Schwarz. Farben nur als Token (`var(--color-*)`), nie als Hex im Code. Keine Teal- oder Messing-Altfarben.
- Weißer Text nur auf `brand/primary` (`#C2410C`), nie auf `brand/accent` (`#EA580C`); dort dunkler Text.
- Schrift: Geist (Text), Geist Mono (Kennungen, Zahlen wie „M0 · 03“). Keine weitere Schriftart.
- Keine Emojis, kein Glow, keine Mehrfach-Schatten, keine Verläufe, kein Lila-auf-Weiß, kein Dark-Mode-Default.
- Keine Platzhalter-Texte („Lorem“, „Text folgt“ ohne Issue), keine erfundenen Zahlen oder Kennzahlen.
- Keine Karten in Karten; eine Hero-Komposition je Screen; Texte kurz, deutsch, konkret.
- Zugänglichkeit vor Optik: Kontrast ≥ 4,5:1, sichtbarer Fokus, Ziele ≥ 44 px.

## Lehren und Skills (SIN-296)

- Nach jedem behobenen Bug (auch im Reparatur-Lauf) ergänzt du `docs/autonomy/LEHREN.md` um **eine Zeile** im selben PR: Was nicht geht → wie es richtig geht. Erst suchen, ob es sie schon gibt. Höchstens 150 Zeilen.
- Wiederholt sich ein Arbeitsablauf, lege `docs/skills/<name>/SKILL.md` an (Aufbau: `docs/skills/README.md`) und nutze vorhandene Skills bei passenden Issues. Neue Skills nennst du im PR unter `## Neue Skills`.
## Qualität

- Jeder Pull Request: Tests grün, axe-core und Lighthouse ohne Fehler.
- Barrierefreiheit: WCAG 2.2 Stufe AA, Kontrast mindestens 4,5 zu 1, komplett per Tastatur bedienbar.
- Leistungsbudget (SIN-300): `performance-budget.json` legt je Route LCP, CLS, TBT und JS-Größe fest; CI (`npm run perf:budget`) blockiert bei Überschreitung. Grenzen nie anheben, um einen Merge durchzubekommen.
- Bildvergleich (SIN-300): `visual.yml` vergleicht Handy- und Desktop-Bilder aller Seiten mit main (Hinweis im Lauf-Bericht, Artefakt `bildvergleich`). Gewollte Änderungen brauchen nichts.
- README und Changelog (SIN-300): Ändern sich Funktion, Einrichtung, Befehle oder Umgebungsvariablen, wird `README.md` im selben PR angepasst (CI warnt sonst). `CHANGELOG.md` ist erzeugt (`npm run changelog`), nie von Hand bearbeiten.- Jede Lerneinheit speichert Quelle und Abrufdatum.
- Zugangsdaten nie ins Repo (öffentlich).

## Draft-PRs und Merge

- Draft-PR nur, solange du noch arbeitest. Fertig und lokal geprüft: auf „Ready for review" stellen. Draft-PRs werden nie automatisch gemerged.
- Nie selbst mergen. Das übernimmt der Auto-Merge (siehe Abschnitt Pull Requests und Merge).
- Label `claude` und `@claude`-Kommentare (`claude.yml`) sind ein Altweg: nicht benutzen, Arbeit startet im T3-Chat.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Schlank bauen: Ponytail (Sinan, 13.10.2026)

Für jede Code-Aufgabe gilt zusätzlich `docs/skills/ponytail/SKILL.md` (Stufe **full**, MIT, Quelle im Dateikopf). Kurz:

1. Braucht es das überhaupt? Nichts bauen, was niemand verlangt hat; Weggelassenes in einer Zeile nennen.
2. Gibt es es schon im Repo (Helfer, Komponente, Muster)? Dann so nutzen wie der Code drumherum.
3. Sonst Standardbibliothek/Plattform, dann eine vorhandene Abhängigkeit. Keine neue Abhängigkeit für ein paar Zeilen.
4. Erst dann minimaler neuer Code. Kürzester vollständiger Diff gewinnt; alle betroffenen Aufrufer, Tests und Fixtures werden mitgezogen.
5. Abkürzung mit bekannter Grenze: Kommentar `shortcut: <Grenze>, <wann ausbauen>`.

Nie gekürzt: Prüfungen an Vertrauensgrenzen, Fehlerbehandlung gegen Datenverlust, Sicherheit, Barrierefreiheit, alles, was im Issue steht. Bei Widerspruch gelten die Regeln dieser Datei (Tests, Entscheidungsdatei, LEHREN.md, Figma). Im PR steht unter `## Ausgelassen` in ein bis zwei Zeilen, was bewusst weggelassen oder nicht geprüft wurde.
