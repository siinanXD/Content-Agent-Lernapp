# Architekturentscheidungen

<!-- Erzeugt von scripts/decisions-index.mjs (npm run decisions:index). Nicht von Hand bearbeiten. -->

Jede Entscheidung ist eine eigene Datei `docs/decisions/<ISSUE-ID>-<kurz>.md` (Links, Entscheidung, Annahmen, Warum).
Keine laufenden Nummern, damit parallele PRs nicht an derselben Datei konfligieren. Diesen Index nie bearbeiten:
`npm run decisions:index` erzeugt ihn, der Agent committet ihn im selben PR (CI prüft ihn).

Ältere Entscheidungen D-01 bis D-47 (inklusive Blocker-Tabelle) stehen unverändert in [ARCHIV-D-01-D-47.md](decisions/ARCHIV-D-01-D-47.md).
Modellnamen und Features nur aus aktuellen Docs/Repos, nie aus dem Gedächtnis.

## Entscheidungen

| Issue | Titel | Datei |
| --- | --- | --- |
| SIN-264 | SIN-264 — Vercel Hobby: Deployments-Limit bewusst akzeptiert | [SIN-264-vercel-deployments-limit.md](decisions/SIN-264-vercel-deployments-limit.md) |
| SIN-263 | SIN-263: Gemeinsamer JSON-Abruf mit Wiederholung, optionale Quellen dürfen ausfallen | [SIN-263-fetchjson-wiederholung.md](decisions/SIN-263-fetchjson-wiederholung.md) |
| SIN-262 | SIN-262: Planer in der Bauphase alle 2 h nachfüllen | [SIN-262-planer-nachfuellen-2h.md](decisions/SIN-262-planer-nachfuellen-2h.md) |
| SIN-261 | SIN-261: merge-gate wieder als echter Job | [SIN-261-merge-gate-job.md](decisions/SIN-261-merge-gate-job.md) |
| SIN-260 | SIN-260 — Bewertungslauf über bestehende Fragen | [SIN-260-bewertungslauf.md](decisions/SIN-260-bewertungslauf.md) |
| SIN-259 | SIN-259 — Sentry-Anbindung: Fehlerzahl für den Planer messbar machen | [SIN-259-sentry-anbindung.md](decisions/SIN-259-sentry-anbindung.md) |
| SIN-258 | SIN-258 — Kosten pro Kurslauf messen: Ledger und Langfuse | [SIN-258-kosten-ledger.md](decisions/SIN-258-kosten-ledger.md) |
| SIN-257 | SIN-257: Lighthouse und axe über alle Routen | [SIN-257-lighthouse-axe-alle-routen.md](decisions/SIN-257-lighthouse-axe-alle-routen.md) |
| SIN-256 | SIN-256 — Offline: Einheiten und Wiederholung ohne Netz | [SIN-256-offline-einheiten.md](decisions/SIN-256-offline-einheiten.md) |
| SIN-255 | SIN-255: E2E-Gesamtweg Start bis Prüfungsmodus | [SIN-255-e2e-gesamtweg.md](decisions/SIN-255-e2e-gesamtweg.md) |
| SIN-254 | SIN-254 — Vercel Hobby: Deployments nahe am Limit | [SIN-254-vercel-deployments.md](decisions/SIN-254-vercel-deployments.md) |
| SIN-253 | SIN-253 — Planer füllt die Schlange nach | [SIN-253-planer-nachfuellen.md](decisions/SIN-253-planer-nachfuellen.md) |
| SIN-252 | SIN-252: Gate lockern, risk:high nur bei echten Risiken | [SIN-252-gate-lockern.md](decisions/SIN-252-gate-lockern.md) |
| SIN-251 | SIN-251 — Entscheidungs-Index im selben PR | [SIN-251-index-im-selben-pr.md](decisions/SIN-251-index-im-selben-pr.md) |
| SIN-250 | SIN-250 — Service-Worker: Cache folgt dem Deploy | [SIN-250-service-worker-cache.md](decisions/SIN-250-service-worker-cache.md) |
| SIN-249 | SIN-249: Einheit öffnen robust, „Referenzberuf“ wird „Dein Betrieb“ | [SIN-249-einheit-oeffnen-betrieb.md](decisions/SIN-249-einheit-oeffnen-betrieb.md) |
| SIN-248 | SIN-248: PR-Steckbrief als Gate-Kommentar | [SIN-248-pr-steckbrief.md](decisions/SIN-248-pr-steckbrief.md) |
| SIN-247 | SIN-247: Gate „wartet auf Freigabe“ gelb statt rot | [SIN-247-gate-gelb.md](decisions/SIN-247-gate-gelb.md) |
| SIN-246 | SIN-246 — Tages-Update um 10:00 und 20:00 | [SIN-246-tages-update.md](decisions/SIN-246-tages-update.md) |
| SIN-245 | SIN-245 — Stil E (Orange/Weiß/Schwarz) aus Figma übernehmen | [SIN-245-stil-e.md](decisions/SIN-245-stil-e.md) |
| SIN-244 | SIN-244 — Planer-Phasen: bauen, dann beobachten und wöchentlich planen | [SIN-244-planer-phasen.md](decisions/SIN-244-planer-phasen.md) |
| SIN-240 | SIN-240 — Loop-Härtung: Agenten-Token überall, Abgleich, eine Datei je Entscheidung, Gate nach CI | [SIN-240-loop-haertung.md](decisions/SIN-240-loop-haertung.md) |
| SIN-236 | SIN-236 — package-lock.json normal committen | [SIN-236-package-lock-committen.md](decisions/SIN-236-package-lock-committen.md) |
| SIN-230 | SIN-230 — Design-Paket 1: Schwerpunkt-Auswahl, Einwilligung, Karte, Feedback | [SIN-230-design-paket-1.md](decisions/SIN-230-design-paket-1.md) |
| SIN-226 | SIN-226 — Planer plant auch Content | [SIN-226-planer-content.md](decisions/SIN-226-planer-content.md) |
| SIN-225 | SIN-225 — Free-Tier-Wächter im Planer | [SIN-225-free-tier-waechter.md](decisions/SIN-225-free-tier-waechter.md) |
