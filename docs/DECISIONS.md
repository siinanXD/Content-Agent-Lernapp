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
| SIN-414 | SIN-414: Variante 2026, neue Lernenden-Screens N1 bis N5 | [SIN-414-beruf-waehlen.md](decisions/SIN-414-beruf-waehlen.md) |
| SIN-409 | SIN-409: Kennzahl „Fragen bewertet“ blieb 0 wegen abweichender Frage-ID | [SIN-409-kennzahl-fragen-id.md](decisions/SIN-409-kennzahl-fragen-id.md) |
| SIN-407 | SIN-407: Abbruchstellen im Kennzahlen-Bericht | [SIN-407-abbruchstellen.md](decisions/SIN-407-abbruchstellen.md) |
| SIN-406 | SIN-406 — Content-Fabrik: Durchsatz je Lauf erhöhen | [SIN-406-fabrik-durchsatz.md](decisions/SIN-406-fabrik-durchsatz.md) |
| SIN-404 | SIN-404: Sicherheits-Stichprobe als Lauf-Auftrag | [SIN-404-sicherheits-lauf.md](decisions/SIN-404-sicherheits-lauf.md) |
| SIN-403 | SIN-403 Fehler-, Leer- und Ladezustände für alle Routen | [SIN-403-zustaende-routen.md](decisions/SIN-403-zustaende-routen.md) |
| SIN-402 | SIN-402: Kennzahlen aus einheitlicher Quelle | [SIN-402-kennzahlen-abfrage.md](decisions/SIN-402-kennzahlen-abfrage.md) |
| SIN-399 | SIN-399: OpenAI als Content-Generator prüfen (Preis, Qualität, Aufwand) | [SIN-399-openai-generator.md](decisions/SIN-399-openai-generator.md) |
| SIN-398 | SIN-398: Goldset-Vergleich auf Haiku 5.5 statt Haiku 4.5 | [SIN-398-generator-haiku-5-5.md](decisions/SIN-398-generator-haiku-5-5.md) |
| SIN-397 | SIN-397: Lauf-PR bleibt aus | [SIN-397-run-task-pr.md](decisions/SIN-397-run-task-pr.md) |
| SIN-396 | SIN-396: Test-UUID für Live-Check und Validierung | [SIN-396-live-check-uuid.md](decisions/SIN-396-live-check-uuid.md) |
| SIN-395 | SIN-395: Verworfene Fragen nie ausspielen, Verwerfungsgründe im Kennzahlen-Bericht | [SIN-395-verworfene-fragen.md](decisions/SIN-395-verworfene-fragen.md) |
| SIN-394 | SIN-394: Kennzahl „Fragen bewertet" — Nenner und Zähler aus demselben Stand | [SIN-394-fragen-bewertet.md](decisions/SIN-394-fragen-bewertet.md) |
| SIN-392 | SIN-392 — Sentry speichert IP und Standort trotz sendDefaultPii false | [SIN-392-sentry-ip.md](decisions/SIN-392-sentry-ip.md) |
| SIN-391 | SIN-391 — Live-Check rot: fehlgeschlagene Prüfungen nennen | [SIN-391-live-check-kennungen.md](decisions/SIN-391-live-check-kennungen.md) |
| SIN-388 | SIN-388: Loop-Worker `groesse:klein` auf Haiku 5.5 | [SIN-388-haiku-5-5.md](decisions/SIN-388-haiku-5-5.md) |
| SIN-387 | SIN-387 — PostHog lädt nach Einwilligung, Abbruch-Ereignisse | [SIN-387-posthog-laden-nach-einwilligung.md](decisions/SIN-387-posthog-laden-nach-einwilligung.md) |
| SIN-386 | SIN-386 — Bewertungslauf fortsetzen: 376 von 1852 Fragen bewertet | [SIN-386-bewertungslauf-fortsetzen.md](decisions/SIN-386-bewertungslauf-fortsetzen.md) |
| SIN-385 | SIN-385 — Demo-Gruppenansicht mit Beispieldaten ohne Konto | [SIN-385-demo-gruppenansicht.md](decisions/SIN-385-demo-gruppenansicht.md) |
| SIN-383 | SIN-383: Langfuse lesbar machen, ein Trace je Einheit mit jeder Frage | [SIN-383-langfuse-trace-je-einheit.md](decisions/SIN-383-langfuse-trace-je-einheit.md) |
| SIN-381 | SIN-381: Review-Fehlalarme verbrauchen keine Reparatur-Runden | [SIN-381-review-fehlalarme.md](decisions/SIN-381-review-fehlalarme.md) |
| SIN-380 | SIN-380: Content-Fabrik schreibt Langfuse-Traces je Schritt | [SIN-380-langfuse-traces-je-schritt.md](decisions/SIN-380-langfuse-traces-je-schritt.md) |
| SIN-379 | SIN-379 — Hugging Face Pro: Richter-Vorprüfung und Dubletten-Erkennung | [SIN-379-hugging-face-pro.md](decisions/SIN-379-hugging-face-pro.md) |
| SIN-378 | SIN-378 — Fabrik-Lauf im Statusprotokoll nachweisen, Ausbleiben melden | [SIN-378-fabrik-lauf-nachweis.md](decisions/SIN-378-fabrik-lauf-nachweis.md) |
| SIN-377 | SIN-377: Sentry stats_period auf erlaubten Wert korrigieren | [SIN-377-sentry-stats-period.md](decisions/SIN-377-sentry-stats-period.md) |
| SIN-376 | SIN-376: Diagramme als Mermaid im Repo | [SIN-376-diagramme-mermaid.md](decisions/SIN-376-diagramme-mermaid.md) |
| SIN-374 | SIN-374 — Migrationen kommen nicht in Supabase an | [SIN-374-migrationen-automatisch.md](decisions/SIN-374-migrationen-automatisch.md) |
| SIN-373 | SIN-373: PostHog-Ereignisse für Abbrüche im Lernweg | [SIN-373-posthog-abbrueche.md](decisions/SIN-373-posthog-abbrueche.md) |
| SIN-371 | SIN-371 — Bewertungslauf: 0 von 1745 Fragen bewertet | [SIN-371-bewertungslauf-null.md](decisions/SIN-371-bewertungslauf-null.md) |
| SIN-370 | SIN-370 Screenreader-Prüfliste und Code-Befunde | [SIN-370-screenreader-pruefliste.md](decisions/SIN-370-screenreader-pruefliste.md) |
| SIN-369 | SIN-369 — Bewertungslauf-Trockenlauf: Voraussetzungen für SIN-348 prüfen | [SIN-369-bewertungslauf-voraussetzungen.md](decisions/SIN-369-bewertungslauf-voraussetzungen.md) |
| SIN-368 | SIN-368 — Fertig-Zustände: Tagesziel erreicht, heute nichts fällig | [SIN-368-fertig-zustaende.md](decisions/SIN-368-fertig-zustaende.md) |
| SIN-367 | SIN-367: Kennzahlen-Bericht wiederholt Schema-Cache-Fehler | [SIN-367-schema-cache-retry.md](decisions/SIN-367-schema-cache-retry.md) |
| SIN-366 | SIN-366 — Lauf: Impressum | [SIN-366-impressum-lauf.md](decisions/SIN-366-impressum-lauf.md) |
| SIN-365 | SIN-365 — Produktreife Sentry: Lauf mit echten Daten | [SIN-365-sentry-lauf.md](decisions/SIN-365-sentry-lauf.md) |
| SIN-361 | SIN-361 — Wächter: übersprungene PR-Ereignis-Läufe von dispatch zählen nicht | [SIN-361-dispatch-skipped-lauf.md](decisions/SIN-361-dispatch-skipped-lauf.md) |
| SIN-360 | SIN-360: Linear Basic, keine Issue-Grenze | [SIN-360-linear-basic.md](decisions/SIN-360-linear-basic.md) |
| SIN-359 | SIN-359: Kennzahlen-Bericht unterscheidet die Ursache bei fehlenden Tabellen | [SIN-359-tabellenfehler-klassen.md](decisions/SIN-359-tabellenfehler-klassen.md) |
| SIN-356 | SIN-356: Gruppe anlegen und Teilnehmende einladen | [SIN-356-gruppe-einladungen.md](decisions/SIN-356-gruppe-einladungen.md) |
| SIN-354 | SIN-354 — Einwilligung und Demo-Zugang als gelaufen belegen | [SIN-354-einwilligung-demo-beleg.md](decisions/SIN-354-einwilligung-demo-beleg.md) |
| SIN-353 | Entscheidung | [SIN-353-rechtsseiten-live.md](decisions/SIN-353-rechtsseiten-live.md) |
| SIN-352 | SIN-352 und SIN-355: Sentry- und PostHog-Kennzahlen im Planer | [SIN-352-sin-355-kennzahlen-secrets.md](decisions/SIN-352-sin-355-kennzahlen-secrets.md) |
| SIN-351 | SIN-351: Kennzahlen melden trotz SIN-347 „Tabelle fehlt“ | [SIN-351-schema-cache-neu-laden.md](decisions/SIN-351-schema-cache-neu-laden.md) |
| SIN-350 | SIN-350: Klare Fehlermeldungen bei Sentry-, PostHog- und Fabrik-Kennzahlen | [SIN-350-kennzahlen-fehlermeldungen.md](decisions/SIN-350-kennzahlen-fehlermeldungen.md) |
| SIN-349 | SIN-349: Figma-Abdeckung messen | [SIN-349-figma-abdeckung.md](decisions/SIN-349-figma-abdeckung.md) |
| SIN-347 | SIN-347: Fehlende Tabellen anwenden und belegen | [SIN-347-fehlende-tabellen-anwenden.md](decisions/SIN-347-fehlende-tabellen-anwenden.md) |
| SIN-346 | SIN-346: Trend-Radar KW 2026-41, Funde vorgemerkt | [SIN-346-trend-radar-kw41.md](decisions/SIN-346-trend-radar-kw41.md) |
| SIN-345 | SIN-345: /start unter dem LCP-Budget | [SIN-345-start-lcp.md](decisions/SIN-345-start-lcp.md) |
| SIN-344 | SIN-344 — Rechtsseiten prüfen und in der Produktreife belegen | [SIN-344-rechtsseiten-produktreife.md](decisions/SIN-344-rechtsseiten-produktreife.md) |
| SIN-335 | SIN-335: Gate auf main härten | [SIN-335-gate-haerten.md](decisions/SIN-335-gate-haerten.md) |
| SIN-334 | SIN-334: Dispatcher sofort nach Merge und bei frei gewordenem Platz anstoßen | [SIN-334-dispatcher-anstossen.md](decisions/SIN-334-dispatcher-anstossen.md) |
| SIN-333 | SIN-333: Gate-Bruch zählt nur frische Läufe, ohne Dependabot, mit Gegencheck auf main | [SIN-333-gate-bruch-frische-laeufe.md](decisions/SIN-333-gate-bruch-frische-laeufe.md) |
| SIN-332 | SIN-332 — Production-Deploy per CLI, Smoke-Test im selben Lauf, Alarm bei Rückstand | [SIN-332-production-deploy-cli.md](decisions/SIN-332-production-deploy-cli.md) |
| SIN-330 | SIN-330: Hostprüfung per URL-Parsing statt Teilstring/Regex | [SIN-330-codeql-hostpruefung.md](decisions/SIN-330-codeql-hostpruefung.md) |
| SIN-329 | SIN-329: Leistungsbudget (Lighthouse) stabilisieren | [SIN-329-lighthouse-aufwaermlauf.md](decisions/SIN-329-lighthouse-aufwaermlauf.md) |
| SIN-328 | SIN-328 — Stillstand ohne Log: Ursache `ohne-start` statt `unbekannt` | [SIN-328-stillstand-ohne-log.md](decisions/SIN-328-stillstand-ohne-log.md) |
| SIN-327 | SIN-327: Urgent zieht vor, wartende PRs geben ihren Platz frei | [SIN-327-urgent-und-wartende-prs.md](decisions/SIN-327-urgent-und-wartende-prs.md) |
| SIN-326 | SIN-326: Variante 2026 · 4/4: Ergebnis, Zustände, Tastatur über alle Fragetypen | [SIN-326-ergebnis-zustaende-tastatur.md](decisions/SIN-326-ergebnis-zustaende-tastatur.md) |
| SIN-325 | SIN-325: Variante 2026 · 2/4: Fragetypen und Ergebnis (W5) | [SIN-325-variante-2026-fragetypen-ergebnis.md](decisions/SIN-325-variante-2026-fragetypen-ergebnis.md) |
| SIN-324 | SIN-324: Variante 2026 · 2/4: Feedback falsch und „Warum?“-Panel | [SIN-324-feedback-und-warum-panel.md](decisions/SIN-324-feedback-und-warum-panel.md) |
| SIN-323 | SIN-323: Variante 2026 · 2/4: Einheit (W4) und Feedback richtig (A2) | [SIN-323-variante-2026-einheit-feedback.md](decisions/SIN-323-variante-2026-einheit-feedback.md) |
| SIN-322 | SIN-322: CI-Gates entsperren (CodeQL, Leistungsbudget) | [SIN-322-ci-gates-entsperren.md](decisions/SIN-322-ci-gates-entsperren.md) |
| SIN-321 | SIN-321 — Skills-Test: Superpowers, Caveman, Impeccable prüfen und eine Woche messen | [SIN-321-skills-test.md](decisions/SIN-321-skills-test.md) |
| SIN-320 | SIN-320 — Sparsam bauen: Verbrauch messen, Modell und Runden nach Größe, Landkarte, Bündeln | [SIN-320-sparsam-bauen.md](decisions/SIN-320-sparsam-bauen.md) |
| SIN-319 | SIN-319 — Live-Check nach jedem Deploy | [SIN-319-live-check.md](decisions/SIN-319-live-check.md) |
| SIN-318 | SIN-318: Variante 2026, Teil 4: Startseite, Ausbilder, Demo/Anmelden, Rechtsseiten | [SIN-318-variante-2026-start-ausbilder.md](decisions/SIN-318-variante-2026-start-ausbilder.md) |
| SIN-317 | SIN-317: Variante 2026 · 3/4: Wiederholung, Prüfung, Profil, Einstellungen | [SIN-317-variante-2026-teil-3.md](decisions/SIN-317-variante-2026-teil-3.md) |
| SIN-315 | SIN-315: Variante 2026, Teil 1: Onboarding und Lernpfad (Heute) | [SIN-315-variante-2026-onboarding-lernpfad.md](decisions/SIN-315-variante-2026-onboarding-lernpfad.md) |
| SIN-314 | SIN-314: Design-Regeln 2026 festschreiben und Tokens ergänzen | [SIN-314-design-regeln-2026.md](decisions/SIN-314-design-regeln-2026.md) |
| SIN-313 | SIN-313: Trend-Radar als wöchentlicher Workflow | [SIN-313-trend-radar.md](decisions/SIN-313-trend-radar.md) |
| SIN-312 | SIN-312: Index-Konflikte ohne KI lösen | [SIN-312-index-konflikte.md](decisions/SIN-312-index-konflikte.md) |
| SIN-311 | SIN-311: Ladezeit verbessern, LCP unter 2,5 s auf Startseite und Lernpfad | [SIN-311-ladezeit-lcp.md](decisions/SIN-311-ladezeit-lcp.md) |
| SIN-310 | SIN-310 — Aufgaben für Sinan als eigene Linear-Issues | [SIN-310-sinan-issues.md](decisions/SIN-310-sinan-issues.md) |
| SIN-309 | SIN-309 — Deploy-Schleife beenden: keine Git-Deploys, ein Hook-Versuch je Commit | [SIN-309-deploy-schleife.md](decisions/SIN-309-deploy-schleife.md) |
| SIN-308 | SIN-308 — Robuste Env-Prüfung, Smoke-Test nach Deploy, Region fra1 | [SIN-308-env-robust-smoke.md](decisions/SIN-308-env-robust-smoke.md) |
| SIN-306 | SIN-306 Figma Community in die Recherche | [SIN-306-figma-community-recherche.md](decisions/SIN-306-figma-community-recherche.md) |
| SIN-303 | SIN-303 — Leitstand 1/3: Ereignisse und Tokens aus der Pipeline nach Supabase | [SIN-303-leitstand-ereignisse.md](decisions/SIN-303-leitstand-ereignisse.md) |
| SIN-302 | SIN-302: Lauf-Workflow mit Secrets für Messläufe und Migrationen | [SIN-302-lauf-workflow.md](decisions/SIN-302-lauf-workflow.md) |
| SIN-301 | SIN-301 — Rechtsseiten: Impressum, Datenschutz, Hinweis zu KI-Inhalten | [SIN-301-rechtsseiten.md](decisions/SIN-301-rechtsseiten.md) |
| SIN-300 | SIN-300: Frontend-Qualität und Pflege (Bildvergleich, Leistungsbudget, Aufräum-Agent, README, Changelog) | [SIN-300-frontend-qualitaet-pflege.md](decisions/SIN-300-frontend-qualitaet-pflege.md) |
| SIN-299 | SIN-299: Langfuse lesbar machen | [SIN-299-langfuse-lesbar.md](decisions/SIN-299-langfuse-lesbar.md) |
| SIN-298 | SIN-298: Worker mit Live-Updates, Reparatur vor dem Push, schnellerem Start | [SIN-298-worker-live-updates.md](decisions/SIN-298-worker-live-updates.md) |
| SIN-297 | SIN-297 — Review-Agent mit zweitem Modell und Recht-und-Inhalt-Wächter | [SIN-297-review-agent.md](decisions/SIN-297-review-agent.md) |
| SIN-296 | SIN-296 — Lehren-Datei, selbst geschriebene Skills und Laufprotokoll pro Worker | [SIN-296-lehren-skills-protokoll.md](decisions/SIN-296-lehren-skills-protokoll.md) |
| SIN-295 | SIN-295 — CodeQL und automatische Paket-Updates | [SIN-295-codeql-updates.md](decisions/SIN-295-codeql-updates.md) |
| SIN-294 | SIN-294 — Notbremse, Erreichbarkeits-Prüfung und Token-Ablauf | [SIN-294-notbremse-erreichbarkeit-token.md](decisions/SIN-294-notbremse-erreichbarkeit-token.md) |
| SIN-293 | SIN-293 — Nächtliche Sicherung der Inhalte mit Wiederherstellungs-Skript | [SIN-293-sicherung.md](decisions/SIN-293-sicherung.md) |
| SIN-292 | SIN-292: Planer unterscheidet „gebaut“ von „gelaufen“ und legt keine Duplikate an | [SIN-292-gebaut-gelaufen.md](decisions/SIN-292-gebaut-gelaufen.md) |
| SIN-291 | SIN-291 — Selbst-Diagnose: Der Loop erkennt Stillstand, nennt die Ursache und legt das Bug-Issue selbst an | [SIN-291-selbst-diagnose.md](decisions/SIN-291-selbst-diagnose.md) |
| SIN-290 | SIN-290 — Serie und Tagesziel im Lern-Erlebnis | [SIN-290-serie-tagesziel.md](decisions/SIN-290-serie-tagesziel.md) |
| SIN-289 | SIN-289 — Sentry in der Pipeline und Statusdatensatz der Content-Fabrik | [SIN-289-sentry-fabrik-status.md](decisions/SIN-289-sentry-fabrik-status.md) |
| SIN-286 | SIN-286: Qualität je Screen messen, Bundle verschlanken | [SIN-286-qualitaet-messen.md](decisions/SIN-286-qualitaet-messen.md) |
| SIN-280 | SIN-280 — Kosten pro Kurslauf messen | [SIN-280-kosten-pro-lauf.md](decisions/SIN-280-kosten-pro-lauf.md) |
| SIN-278 | SIN-278: Sicherheits-Stichprobe gegen die Live-App | [SIN-278-live-stichprobe.md](decisions/SIN-278-live-stichprobe.md) |
| SIN-277 | SIN-277 — Datenmodell für Demo-Anfragen und Ausbilder-Ansicht | [SIN-277-datenmodell.md](decisions/SIN-277-datenmodell.md) |
| SIN-277 | SIN-277 — Design-Paket 2: Startseite, Ausbilder-Ansicht, Demo-Zugang, Prüfungsergebnis | [SIN-277-design-paket-2.md](decisions/SIN-277-design-paket-2.md) |
| SIN-275 | SIN-275 — Frontend-Worker prüfen sich selbst (Screenshots + Design-Checkliste) | [SIN-275-frontend-selbstpruefung.md](decisions/SIN-275-frontend-selbstpruefung.md) |
| SIN-274 | SIN-274: Figma-Abgleich „17 Zustände“ | [SIN-274-figma-abgleich.md](decisions/SIN-274-figma-abgleich.md) |
| SIN-273 | SIN-273 — Sentry und PostHog prüfen, Planer-Auslese vervollständigen | [SIN-273-sentry-posthog-planer.md](decisions/SIN-273-sentry-posthog-planer.md) |
| SIN-272 | SIN-272: Sicherheits-Stichprobe MAF Metall | [SIN-272-sicherheits-stichprobe.md](decisions/SIN-272-sicherheits-stichprobe.md) |
| SIN-271 | SIN-271: Hex-Farben entfernen, Messung nachweisen | [SIN-271-hex-farben-und-messung.md](decisions/SIN-271-hex-farben-und-messung.md) |
| SIN-270 | SIN-270 — Bewertungslauf aller Fragen mit Langfuse-Meldung | [SIN-270-bewertungslauf-langfuse.md](decisions/SIN-270-bewertungslauf-langfuse.md) |
| SIN-269 | SIN-269: E2E-Gesamtweg je veröffentlichtem Kurs | [SIN-269-e2e-je-kurs.md](decisions/SIN-269-e2e-je-kurs.md) |
| SIN-268 | SIN-268 — Kostenmessung pro Kurslauf reparieren | [SIN-268-kostenmessung.md](decisions/SIN-268-kostenmessung.md) |
| SIN-267 | SIN-267 — Tages-Update: Wiederholungsschutz nach Zeit statt nach Tag | [SIN-267-digest-wiederholungsschutz.md](decisions/SIN-267-digest-wiederholungsschutz.md) |
| SIN-266 | SIN-266 — Deploys bündeln, Planung nicht blockieren | [SIN-266-deploys-buendeln.md](decisions/SIN-266-deploys-buendeln.md) |
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
| SIN-202 | SIN-202 — Projekt-Starter: Plan zuerst, Ausführung erst nach stabiler Woche | [SIN-202-projekt-starter.md](decisions/SIN-202-projekt-starter.md) |
